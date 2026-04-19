import type { RoleOutput } from '../types/index.js';

/** 香車（Kyosha）— セキュリティ・認可・脆弱性 */
export const kyoshaOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'kyosha',
    sections: [
      {
        label: '認可設計',
        body: 'ロールベースアクセス制御（RBAC）を使用し、`admin` ロールのみCSV出力エンドポイントへのアクセスを許可する。フロントエンドの制御のみに依存しない。',
      },
      {
        label: '脆弱性リスク',
        body: 'フロントエンドでのボタン非表示だけでは不十分。APIへの直接リクエストを防ぐため、バックエンドで必ず認可チェックを行う。',
      },
      {
        label: 'セキュリティ要件',
        body: '認可失敗時は 403 Forbidden を返す。エラーレスポンスに内部情報（ロール名・権限詳細）を含めない。アクセスログを記録する。',
      },
    ],
  },
  global: {
    roleId: 'kyosha',
    sections: [
      {
        label: 'Authorization design',
        body: 'Use role-based access control (RBAC). Only the `admin` role may access the CSV export endpoint. Do not rely solely on frontend visibility.',
      },
      {
        label: 'Vulnerability risk',
        body: 'Hiding the button on the frontend is insufficient. Always enforce authorization on the backend to prevent direct API requests.',
      },
      {
        label: 'Security requirements',
        body: 'Return 403 Forbidden on authorization failure. Do not expose internal details (role names, permission specifics) in error responses. Log all access attempts.',
      },
    ],
  },
};
