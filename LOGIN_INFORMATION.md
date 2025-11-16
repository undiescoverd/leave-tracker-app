# 🔐 TDH Agency Leave Tracker - Login Information

## ✅ **WORKING LOGIN CREDENTIALS**

The login system is working correctly! Here are the valid credentials:

### **👨‍💼 Admin Users**
| Email | Name | Role | Password |
|-------|------|------|----------|
| `senay@tdhagency.com` | Senay Taormina | ADMIN | `Password123!` |
| `ian@tdhagency.com` | Ian Vincent | ADMIN | `Password123!` |

### **👥 Regular Users**
| Email | Name | Role | Password |
|-------|------|------|----------|
| `sup@tdhagency.com` | Sup Dhanasunthorn | USER | `Password123!` |
| `luis@tdhagency.com` | Luis Drake | USER | `Password123!` |

## 🚨 **ISSUE IDENTIFIED & SOLUTION**

### **Problem:**
- You tried logging in with `ian@tdhagency.com` 
- Server is running on port **3001** but NEXTAUTH_URL is set to port **3000**
- This causes authentication redirect issues

### **Solution:**
Update your `.env.local` file:

```bash
# Change this line:
NEXTAUTH_URL="http://localhost:3000"

# To this:
NEXTAUTH_URL="http://localhost:3001"
```

### **Quick Fix:**
1. Open `.env.local` file
2. Change `NEXTAUTH_URL="http://localhost:3000"` to `NEXTAUTH_URL="http://localhost:3001"`
3. Restart the development server
4. Try logging in again

## 🌐 **Access URLs**

- **Main App**: http://localhost:3001
- **Login Page**: http://localhost:3001/login
- **Admin Dashboard**: http://localhost:3001/admin/pending-requests
- **Database Studio**: http://localhost:5555 (Prisma Studio)

## 🧪 **Testing Results**

✅ **Database**: 4 users found and verified  
✅ **Password**: `Password123!` works for all users  
✅ **Authentication**: System working correctly  
✅ **Roles**: Admin and User roles properly assigned  

## 🔧 **If Login Still Doesn't Work**

1. **Clear browser cache** (Ctrl+F5 or Cmd+Shift+R)
2. **Check browser console** for errors
3. **Try incognito/private mode**
4. **Restart development server** after updating NEXTAUTH_URL

## 📝 **Notes**

- All users have the same default password: `Password123!`
- Users were created on 2025-09-01
- Password is properly hashed with bcrypt
- Authentication logs show the system is working correctly
