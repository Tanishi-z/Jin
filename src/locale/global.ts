import type { Locale } from './ja.js';

export const global: Locale = {
  tagline: 'Jin helps you decide the next move.',
  description: 'Kin, Gin, Hisha, and Kaku shape your vision into a clear formation.',

  requestTypeSelect: {
    prompt: 'What do you want to do?',
    types: {
      new_project:  'Start a new project',
      new_feature:  'Add a new feature',
      improvement:  'Improve an existing feature',
      other:        'Other',
    },
    implement:      'Implement a step',
    settings:       'Change Jin settings',
    agentManager:   'Manage agents',
  },

  requirementsDialog: {
    title:       'New Project — Requirements',
    kinLabel:    'Kin',
    inputPrompt: 'Your reply (leave blank + Enter to finalize with current content)',
    skipHint:    'Leave blank and press Enter to finalize',
    confirm:     'Proceed with these requirements?',
    confirmActions: {
      proceed: 'Proceed',
      revise:  'I want to clarify something',
      cancel:  'Cancel',
    },
    cancelled:   'Requirements gathering cancelled',
  },

  requestInput: {
    prompt:      'Describe your vision',
    hint:        'Adding context or intent will help Jin shape a better proposal.',
    placeholder: 'e.g. Allow only admins to export CSV',
  },

  requestConfirm: {
    label:  'Confirm your vision',
    actions: {
      start:  'Start shaping this request',
      edit:   'Edit the request',
      cancel: 'Cancel',
    },
  },

  inReview: {
    messages: {
      kin:    'Kin is clarifying goals and constraints...',
      gin:    'Gin is shaping the user flow...',
      hisha:  'Hisha is designing the architecture...',
      kaku:   'Kaku is inspecting risks and coverage...',
      keima:  'Keima is reviewing data and metrics...',
      kyosha: 'Kyosha is checking security and authorization...',
      fu:     'Fu is planning documentation and tasks...',
    },
    /** 実装フェーズ（成り駒）のメッセージ */
    implMessages: {
      gin:    'Narigin is implementing components...',
      hisha:  'Ryuuou is implementing backend logic...',
      kaku:   'Ryuuma is implementing tests...',
      keima:  'Narikei is implementing the data layer...',
      kyosha: 'Narikyou is implementing auth and permissions...',
      fu:     'Tokin is generating documentation...',
    },
    promoting: (name: string, promoted: string) => `${name} → promotes to ${promoted}`,
    done: 'Review complete',
  },

  proposalReady: {
    title: 'Reports are ready',
    roleLabels: {
      kin:    'Review Kin',
      gin:    'Review Gin',
      hisha:  'Review Hisha',
      kaku:   'Review Kaku',
      keima:  'Review Keima',
      kyosha: 'Review Kyosha',
      fu:     'Review Fu',
    },
    full:   'Review the full proposal',
    revise: 'Revise the vision',
    apply:  'Give the order',
    later:  'Save for later',
  },

  fullProposal: {
    title:   'Full Report',
    actions: {
      apply:  'Give the order',
      revise: 'Revise the vision',
      back:   'Back',
    },
  },

  roleReview: {
    names: {
      kin:    'Kin',
      gin:    'Gin',
      hisha:  'Hisha',
      kaku:   'Kaku',
      keima:  'Keima',
      kyosha: 'Kyosha',
      fu:     'Fu',
    },
    actions: {
      apply: 'Give the order',
      back:  'Back',
    },
  },

  applyConfirm: {
    prompt: 'Apply this proposal?',
    actions: {
      apply: 'Apply now',
      save:  'Save without applying',
      back:  'Back',
    },
  },

  taskSelect: {
    featurePrompt: 'Select a feature to implement',
    taskPrompt:    'Select a step to implement',
    empty:         'No pending features found in .jin/tasks/backlog.md',
    pending:       (n: number) => `${n} step${n === 1 ? '' : 's'}`,
    back:          'Back',
  },

  implementing: {
    message: (title: string) => `Implementing "${title}"...`,
    done:    'Implementation complete',
  },

  diffReview: {
    title:       'Implementation preview',
    explanation: 'What was implemented',
    actions: {
      apply:   'Apply (write to files)',
      reorder: 'Give additional instructions',
      discard: 'Discard',
    },
  },

  implemented: {
    title:   'Implementation applied',
    actions: {
      next:   'Implement next step',
      exit:   'Exit',
    },
  },

  docPreview: {
    title:         'Review what will be saved',
    specTitle:     'Spec changes',
    taskTitle:     'Step list',
    decisionTitle: 'Decision log',
    actions: {
      apply:  'Give the order (save)',
      revise: 'Revise',
      later:  'Save for later',
    },
  },

  applied: {
    title:   'Order given',
    details: [
      'Permission specs updated',
      'List screen behavior updated',
      'Implementation steps added',
      'Decision log recorded',
    ],
    actions: {
      addAnother:  'Add another vision',
      changeAgent: 'Change Local LLM settings',
      exit:        'Exit',
    },
  },
};
