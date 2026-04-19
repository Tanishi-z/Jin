import type { RoleId, RequestType } from '../types/index.js';

export const ja = {
  tagline: 'あなたの次の一手を、布陣で支える',
  description: '自然言語の構想を受け取り、駒たちが次の一手を支えます。',

  requestTypeSelect: {
    prompt: 'やりたいことを選んでください',
    types: {
      new_project:  '新しいプロジェクトを始める',
      new_feature:  '新しい機能を追加する',
      improvement:  '既存機能を改善する',
      other:        'その他',
    } satisfies Record<RequestType, string>,
    implement:      '手順を実装する',
    settings:       'Jin の設定を変更する',
    agentManager:   'エージェントを管理する',
  },

  requirementsDialog: {
    title:       '新規プロジェクト — 要件定義',
    kinLabel:    '金',
    inputPrompt: '返答を入力してください',
    skipHint:    '空白のまま Enter で現在の内容で進む',
    confirm:     'この要件で進めますか？',
    confirmActions: {
      proceed: 'このまま進める',
      revise:  '修正したい点を伝える',
      cancel:  'キャンセル',
    },
    cancelled:   '要件定義をキャンセルしました',
  },

  requestInput: {
    prompt:      '内容を入力してください',
    hint:        '背景や目的も書くと、より整理しやすくなります。',
    placeholder: '例：管理者だけCSVを出力できるようにしたい',
  },

  requestConfirm: {
    label:  '構想内容の確認',
    actions: {
      start:  'この内容で整理を始める',
      edit:   '内容を修正する',
      cancel: 'キャンセル',
    },
  },

  inReview: {
    messages: {
      kin:    '金が目的と制約を整理しています...',
      gin:    '銀が体験の流れを整えています...',
      hisha:  '飛車がアーキテクチャを設計しています...',
      kaku:   '角が影響範囲と品質観点を確認しています...',
      keima:  '桂馬がデータと計測観点を確認しています...',
      kyosha: '香車がセキュリティと認可を確認しています...',
      fu:     '歩がドキュメント計画を整理しています...',
    } satisfies Record<RoleId, string>,
    /** 実装フェーズ（成り駒）のメッセージ */
    implMessages: {
      gin:    '成銀がコンポーネントを実装しています...',
      hisha:  '龍王がバックエンドを実装しています...',
      kaku:   '龍馬がテストを実装しています...',
      keima:  '成桂がデータ層を実装しています...',
      kyosha: '成香が認証・認可を実装しています...',
      fu:     'と金がドキュメントを生成しています...',
    },
    promoting: (name: string, promoted: string) => `${name} → ${promoted} に成ります`,
    done: '整理が完了しました',
  },

  proposalReady: {
    title:  '報告が揃いました',
    roleLabels: {
      kin:    '金の整理を見る',
      gin:    '銀の提案を見る',
      hisha:  '飛車の実装計画を見る',
      kaku:   '角の確認結果を見る',
      keima:  '桂馬の分析を見る',
      kyosha: '香車のセキュリティ確認を見る',
      fu:     '歩の整理を見る',
    } satisfies Record<RoleId, string>,
    full:   '全体を確認する',
    revise: '構想を修正する',
    apply:  '采配を下す',
    later:  'あとで見直す',
  },

  fullProposal: {
    title:   '統合報告',
    actions: {
      apply:  '采配を下す',
      revise: '構想を修正する',
      back:   '戻る',
    },
  },

  roleReview: {
    names: {
      kin:    '金',
      gin:    '銀',
      hisha:  '飛車',
      kaku:   '角',
      keima:  '桂馬',
      kyosha: '香車',
      fu:     '歩',
    } satisfies Record<RoleId, string>,
    actions: {
      apply: '采配を下す',
      back:  '戻る',
    },
  },

  applyConfirm: {
    prompt: 'この報告を仕様に反映しますか？',
    actions: {
      apply: '反映する',
      save:  '反映せず保存する',
      back:  '戻る',
    },
  },

  taskSelect: {
    featurePrompt: '実装する構想を選んでください',
    taskPrompt:    '実装する手順を選んでください',
    empty:         '.jin/tasks/backlog.md に未完了の構想がありません',
    pending:       (n: number) => `手順 ${n} 件`,
    back:          '戻る',
  },

  implementing: {
    message: (title: string) => `「${title}」を実装しています...`,
    done:    '実装が完了しました',
  },

  diffReview: {
    title:       '実装プレビュー',
    explanation: '実装内容',
    actions: {
      apply:   '取り込む（ファイルに書き出す）',
      reorder: '追加指示を出す',
      discard: '破棄する',
    },
  },

  implemented: {
    title:   '実装を取り込みました',
    actions: {
      next:   '次の手順を実装する',
      exit:   '終了',
    },
  },

  docPreview: {
    title:       '采配の内容を確認してください',
    specTitle:   '仕様差分',
    taskTitle:   '手順一覧',
    decisionTitle: '決定事項',
    actions: {
      apply:  '采配を下す（保存する）',
      revise: '修正する',
      later:  '保留にする',
    },
  },

  applied: {
    title:   '采配を下しました',
    details: [
      '権限制御仕様を更新しました',
      '一覧画面の仕様を更新しました',
      '手順を追加しました',
      '决定事項を記録しました',
    ],
    actions: {
      addAnother:  '別の構想を追加する',
      changeAgent: 'ローカルLLM設定を変更する',
      exit:        '終了',
    },
  },
};

export type Locale = typeof ja;
