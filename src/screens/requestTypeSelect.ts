import { select } from '@clack/prompts';
import { getLocale } from '../locale/index.js';
import type { Mode, RequestType, NextScreen } from '../types/index.js';

export async function requestTypeSelect(mode: Mode): Promise<NextScreen> {
  const t = getLocale(mode);

  const options = [
    // 構想フローへ進む通常の選択肢
    ...(Object.entries(t.requestTypeSelect.types) as [RequestType, string][]).map(
      ([value, label]) => ({ value, label }),
    ),
    // 実装モード（構想フローをスキップして手順選択へ）
    { value: '__implement__',     label: t.requestTypeSelect.implement     },
    // エージェント管理
    { value: '__agent_manager__', label: t.requestTypeSelect.agentManager  },
    // 設定変更
    { value: '__settings__',      label: t.requestTypeSelect.settings      },
  ];

  const choice = await select<string>({
    message: t.requestTypeSelect.prompt,
    options,
  });

  if (typeof choice === 'symbol')         return { screen: 'exit' };
  if (choice === '__implement__')         return { screen: 'taskSelect' };
  if (choice === '__agent_manager__')     return { screen: 'agentManager' };
  if (choice === '__settings__')          return { screen: 'localLLMSetup' };

  // 新規プロジェクトは金との対話で要件定義
  if (choice === 'new_project') return { screen: 'requirementsDialog' };

  return { screen: 'requestInput', requestType: choice as RequestType };
}
