import { select } from '@clack/prompts';
import type { Mode, NextScreen } from '../types/index.js';

/** 「Jin の設定を変更する」から入る設定サブメニュー */
export async function settingsMenu(mode: Mode): Promise<NextScreen> {
  const isJa = mode === 'ja';

  const choice = await select<string>({
    message: isJa ? '設定項目を選んでください' : 'Choose a setting to change',
    options: [
      {
        value: 'localLLMSetup',
        label: isJa ? 'ローカルLLMセットアップ' : 'Local LLM Setup',
        hint:  isJa ? 'モデルの追加・既定モデルの変更' : 'Add models, change the default model',
      },
      {
        value: 'roleModelAssign',
        label: isJa ? '駒ごとのモデルを設定する' : 'Piece model assignment',
        hint:  isJa ? '駒ごとに使用するモデルを割り当てる' : 'Assign a model to each piece',
      },
      { value: '__back__', label: isJa ? '戻る' : 'Back' },
    ],
  });

  if (typeof choice === 'symbol' || choice === '__back__') {
    return { screen: 'requestTypeSelect' };
  }

  return { screen: choice as 'localLLMSetup' | 'roleModelAssign' };
}
