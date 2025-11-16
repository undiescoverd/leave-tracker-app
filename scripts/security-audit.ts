#!/usr/bin/env tsx
/**
 * Security Audit Script
 * Validates security implementations across the application
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  recommendation: string;
}

interface SecurityAuditResult {
  totalFiles: number;
  securedFiles: number;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private securedFiles = 0;
  private totalFiles = 0;

  // Security patterns to check for
  private patterns = {
    // Authentication patterns
    hasProperAuth: /with(Admin|User)Auth|requireAdmin|getAuthenticatedUser/,
    usesOldAuth: /getServerSession.*authOptions/,
    
    // Rate limiting patterns
    hasRateLimit: /withAuthRateLimit|withPublicRateLimit/,
    
    // Input validation patterns
    hasValidation: /validationSchemas|withCompleteSecurity.*validateInput.*true/,
    hasInputSanitization: /sanitizeObject|sanitizationRules/,
    
    // Security middleware patterns
    hasSecurityMiddleware: /withCompleteSecurity|withSecurity/,
    
    // Dangerous patterns
    directPrismaWithoutAuth: /prisma\.(user|leaveRequest)\.(findMany|create|update|delete)/,
    sqlInjectionRisk: /\$\{.*\}.*prisma|prisma\..*raw/,
    xssRisk: /innerHTML|dangerouslySetInnerHTML/,
    
    // Admin operations
    adminOperation: /\/api\/admin\//,
    bulkOperation: /bulk.*approve|bulk.*reject|updateMany|deleteMany/,
  };

  async auditDirectory(dirPath: string): Promise<void> {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.auditDirectory(fullPath);
      } else if (extname(entry) === '.ts' && entry.includes('route.ts')) {
        await this.auditFile(fullPath);
      }
    }
  }

  private async auditFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      this.totalFiles++;

      let hasProperAuth = false;
      let hasRateLimit = false;
      let hasValidation = false;
      let hasSanitization = false;
      let hasSecurityMiddleware = false;
      let isAdminRoute = false;
      let hasBulkOperations = false;

      // Check each line for patterns
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for security patterns
        if (this.patterns.hasProperAuth.test(line)) hasProperAuth = true;
        if (this.patterns.hasRateLimit.test(line)) hasRateLimit = true;
        if (this.patterns.hasValidation.test(line)) hasValidation = true;
        if (this.patterns.hasInputSanitization.test(line)) hasSanitization = true;
        if (this.patterns.hasSecurityMiddleware.test(line)) hasSecurityMiddleware = true;
        if (this.patterns.adminOperation.test(filePath)) isAdminRoute = true;
        if (this.patterns.bulkOperation.test(line)) hasBulkOperations = true;

        // Check for vulnerabilities
        if (this.patterns.usesOldAuth.test(line)) {
          this.addIssue('high', filePath, lineNum, 
            'Uses deprecated NextAuth v4 pattern', 
            'Update to use NextAuth v5 auth() function with proper middleware'
          );
        }

        if (this.patterns.sqlInjectionRisk.test(line)) {
          this.addIssue('critical', filePath, lineNum,
            'Potential SQL injection vulnerability',
            'Use parameterized queries and avoid raw SQL with user input'
          );
        }

        if (this.patterns.xssRisk.test(line)) {
          this.addIssue('high', filePath, lineNum,
            'Potential XSS vulnerability',
            'Use proper sanitization and avoid dangerouslySetInnerHTML'
          );
        }

        // Check for direct database access without auth
        if (this.patterns.directPrismaWithoutAuth.test(line) && !hasProperAuth) {
          this.addIssue('high', filePath, lineNum,
            'Database access without authentication check',
            'Add authentication middleware before database operations'
          );
        }
      });

      // File-level security checks
      if (isAdminRoute && !hasProperAuth) {
        this.addIssue('critical', filePath, undefined,
          'Admin route without proper authentication',
          'Add withAdminAuth middleware to secure admin endpoints'
        );
      }

      if (hasBulkOperations && !hasSecurityMiddleware) {
        this.addIssue('high', filePath, undefined,
          'Bulk operations without security middleware',
          'Add comprehensive security middleware for bulk operations'
        );
      }

      if ((filePath.includes('POST') || content.includes('export async function POST')) && !hasValidation) {
        this.addIssue('medium', filePath, undefined,
          'POST endpoint without input validation',
          'Add input validation middleware for data integrity'
        );
      }

      if ((filePath.includes('POST') || content.includes('export async function POST')) && !hasSanitization) {
        this.addIssue('medium', filePath, undefined,
          'POST endpoint without input sanitization',
          'Add input sanitization to prevent XSS attacks'
        );
      }

      if (!hasRateLimit && !filePath.includes('api/auth')) {
        this.addIssue('low', filePath, undefined,
          'No rate limiting configured',
          'Add rate limiting to prevent API abuse'
        );
      }

      // Mark as secured if it has proper middleware
      if (hasSecurityMiddleware && hasProperAuth) {
        this.securedFiles++;
      }

    } catch (error) {
      this.addIssue('medium', filePath, undefined,
        `File reading error: ${error}`,
        'Investigate file accessibility and syntax issues'
      );
    }
  }

  private addIssue(type: SecurityIssue['type'], file: string, line: number | undefined, issue: string, recommendation: string): void {
    this.issues.push({
      type,
      file: file.replace(process.cwd(), ''),
      line,
      issue,
      recommendation
    });
  }

  public getResults(): SecurityAuditResult {
    const summary = this.issues.reduce(
      (acc, issue) => {
        acc[issue.type]++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    return {
      totalFiles: this.totalFiles,
      securedFiles: this.securedFiles,
      issues: this.issues.sort((a, b) => {
        const severity = { critical: 4, high: 3, medium: 2, low: 1 };
        return severity[b.type] - severity[a.type];
      }),
      summary
    };
  }
}

async function runSecurityAudit(): Promise<void> {
  console.log('🔍 Starting Security Audit...\n');

  const auditor = new SecurityAuditor();
  const apiDir = join(process.cwd(), 'src/app/api');
  
  try {
    await auditor.auditDirectory(apiDir);
    const results = auditor.getResults();

    // Print summary
    console.log('📊 SECURITY AUDIT SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total API files analyzed: ${results.totalFiles}`);
    console.log(`Properly secured files: ${results.securedFiles}`);
    console.log(`Security coverage: ${Math.round((results.securedFiles / results.totalFiles) * 100)}%\n`);

    // Print issue summary
    console.log('🚨 SECURITY ISSUES FOUND:');
    console.log(`Critical: ${results.summary.critical}`);
    console.log(`High: ${results.summary.high}`);
    console.log(`Medium: ${results.summary.medium}`);
    console.log(`Low: ${results.summary.low}\n`);

    // Print detailed issues
    if (results.issues.length > 0) {
      console.log('📝 DETAILED FINDINGS:');
      console.log('═'.repeat(50));
      
      results.issues.forEach((issue, index) => {
        const severity = {
          critical: '🚨',
          high: '⚠️',
          medium: '📋',
          low: '💡'
        };

        console.log(`${index + 1}. ${severity[issue.type]} ${issue.type.toUpperCase()}`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
      });
    } else {
      console.log('✅ No security issues found!\n');
    }

    // Security score
    const maxScore = 100;
    const criticalPenalty = results.summary.critical * 25;
    const highPenalty = results.summary.high * 15;
    const mediumPenalty = results.summary.medium * 5;
    const lowPenalty = results.summary.low * 1;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const securityScore = Math.max(0, maxScore - totalPenalty);

    console.log('🎯 SECURITY SCORE');
    console.log('═'.repeat(50));
    console.log(`Score: ${securityScore}/100`);
    
    if (securityScore >= 90) {
      console.log('Status: ✅ EXCELLENT - Production ready');
    } else if (securityScore >= 80) {
      console.log('Status: ⚠️ GOOD - Minor improvements needed');
    } else if (securityScore >= 60) {
      console.log('Status: 📋 FAIR - Moderate security issues');
    } else {
      console.log('Status: 🚨 POOR - Critical security issues');
    }

    console.log('\n🔒 SECURITY RECOMMENDATIONS:');
    console.log('═'.repeat(50));
    
    if (results.summary.critical > 0) {
      console.log('1. ❗ Address all CRITICAL issues immediately before deployment');
    }
    if (results.summary.high > 0) {
      console.log('2. ⚠️ Fix HIGH severity issues within 24 hours');
    }
    if (results.securedFiles / results.totalFiles < 0.8) {
      console.log('3. 🔧 Apply security middleware to remaining unprotected routes');
    }
    
    console.log('4. 📊 Run this audit regularly as part of CI/CD pipeline');
    console.log('5. 🛡️ Consider implementing WAF rules for additional protection');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  runSecurityAudit().catch(console.error);
}

export { runSecurityAudit };