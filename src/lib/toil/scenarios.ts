import { TOILScenario } from '@/lib/types/toil';

export const TOIL_SCENARIOS = {
  [TOILScenario.LOCAL_SHOW]: {
    label: 'Local Show Watch',
    description: 'Show watch in home/local city',
    helpText: 'No TOIL allocated - voluntary attendance',
    contractRef: 'Section 6.6(a)'
  },
  [TOILScenario.WORKING_DAY_PANEL]: {
    label: 'Working Day + Panel/Showcase',
    description: 'Travel for agent panel or showcase',
    helpText: 'Start at 1pm the following day',
    contractRef: 'Section 6.6(b)'
  },
  [TOILScenario.OVERNIGHT_DAY_OFF]: {
    label: 'Overnight + Day Off Travel',
    description: 'Returning home on a scheduled day off',
    helpText: '4 hours TOIL allocated',
    contractRef: 'Section 6.6(c)'
  },
  [TOILScenario.OVERNIGHT_WORKING_DAY]: {
    label: 'Overnight + Working Day Travel',
    description: 'Returning home on a working day',
    helpText: 'TOIL based on arrival time',
    contractRef: 'Section 6.6(d)'
  }
};