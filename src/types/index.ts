/** 表示モード */
export type Mode = 'ja' | 'global';

/** .agent.md ファイルで指定できるフェーズ */
export type AgentPhase = 'analysis' | 'impl' | 'review' | 'summary';

/**
 * .agent.md ファイルから読み込んだエージェント定義。
 * フロントマターのフィールドと本文（システムプロンプト）を保持する。
 */
export interface AgentDefinition {
  /** 駒IDまたはカスタムID（例: "kin", "security-reviewer"） */
  id: string;
  /** 表示名（例: "セキュリティ審査官"） */
  name: string;
  /** エージェントの説明文（Claude Code の description フィールドと共通） */
  description?: string;
  /** このエージェントが担当するフェーズ */
  phase: AgentPhase;
  /** どの駒IDに対応するか（省略時は id と同じ） */
  roleId?: RoleId;
  /** 使用するモデル名（省略時はグローバル設定を使用） */
  model?: string;
  /** 推論温度（0〜1、省略時は 0.3） */
  temperature?: number;
  /** 許可ツール一覧（Claude Code 互換フィールド、Jin では無視） */
  tools?: string;
  /** システムプロンプト本文 */
  systemPrompt: string;
  /** 読み込み元ファイルパス */
  filePath: string;
  /** 有効かどうか（false で無効化） */
  enabled: boolean;
}

/** JinConfig に追加：駒IDごとに有効なカスタムエージェントIDを指定する */
export type ActiveAgentMap = Partial<Record<RoleId, string>>;

/** 永続化する設定 */
export interface JinConfig {
  mode?: Mode;
  /** デフォルトモデル名（ollama pull したモデル名） */
  localModel?: string;
  /** 駒ごとのモデル割り当て（未設定の駒は localModel を使用） */
  roleModels?: Partial<Record<RoleId, string>>;
  /** 駒ごとに有効化するカスタムエージェントID（.agent.md の id フィールド） */
  activeAgents?: ActiveAgentMap;
}

/** 構想の種類 */
export type RequestType =
  | 'new_project'   // 新しいプロジェクトを始める
  | 'new_feature'   // 新しい機能を追加する
  | 'improvement'   // 既存機能を改善する
  | 'other';        // その他

/** ロールの識別子 */
export type RoleId = 'kin' | 'gin' | 'hisha' | 'kaku' | 'keima' | 'kyosha' | 'fu';

/** 成り駒の識別子（実装フェーズで使用） */
export type PromotedRoleId = 'tokin' | 'narigin' | 'narikei' | 'narikyou' | 'ryuuou' | 'ryuuma';

/** 通常の駒IDから成り駒IDへのマッピング（金は成らない） */
export const PROMOTION_MAP: Partial<Record<RoleId, PromotedRoleId>> = {
  fu:     'tokin',
  gin:    'narigin',
  keima:  'narikei',
  kyosha: 'narikyou',
  hisha:  'ryuuou',
  kaku:   'ryuuma',
};

/** ロール別の出力 */
export interface RoleOutput {
  roleId: RoleId;
  /** セクションのリスト（ラベル + 本文） */
  sections: Array<{
    label: string;
    body: string;
  }>;
}

/** 統合提案 */
export interface Proposal {
  requestType: RequestType;
  requestText: string;
  summary: string[];
  /** 今回の構想に関与したロールのみ含む */
  activeRoles: RoleId[];
  roles: Partial<Record<RoleId, RoleOutput>>;
}

/** 構想（backlog.md の H2 ブロック） */
export interface Feature {
  title: string;
  /** `> ` で始まる説明行 */
  description?: string;
  tasks: Task[];
  pendingCount: number;
}

/** 手順（構想の中の1ステップ） */
export interface Task {
  /** ファイル内の行番号（更新時に使う） */
  lineIndex: number;
  title: string;
  completed: boolean;
  /** どの構想に属するか */
  featureTitle: string;
  /** インデントされた詳細行 */
  detail?: string;
}

/** 生成されたファイルの変更内容 */
export interface FileChange {
  /** カレントディレクトリからの相対パス */
  path: string;
  type: 'create' | 'modify' | 'delete';
  content: string;
  originalContent?: string;
}

/** エージェントが生成した実装結果 */
export interface ImplResult {
  task: Task;
  files: FileChange[];
  /** 実装の説明 */
  explanation: string;
}

/** 画面遷移の次の行き先 */
export type NextScreen =
  | { screen: 'agentManager' }
  | { screen: 'localLLMSetup' }
  | { screen: 'roleModelAssign' }
  | { screen: 'requestTypeSelect' }
  | { screen: 'requirementsDialog' }
  | { screen: 'requestInput'; requestType: RequestType }
  | { screen: 'requestConfirm'; requestType: RequestType; requestText: string }
  | { screen: 'inReview'; requestType: RequestType; requestText: string }
  | { screen: 'proposalReady'; proposal: Proposal }
  | { screen: 'fullProposal'; proposal: Proposal }
  | { screen: 'roleReview'; roleId: RoleId; proposal: Proposal }
  | { screen: 'docPreview'; proposal: Proposal }
  | { screen: 'applied' }
  | { screen: 'taskSelect'; feature?: Feature }
  | { screen: 'implementing'; task: Task; feature: Feature; instruction?: string }
  | { screen: 'diffReview'; result: ImplResult; feature: Feature }
  | { screen: 'implemented'; task: Task }
  | { screen: 'exit' };
