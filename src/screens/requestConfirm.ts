import { select, note } from '@clack/prompts';
import { getLocale } from '../locale/index.js';
import type { Mode, RequestType, NextScreen } from '../types/index.js';

export async function requestConfirm(
  mode: Mode,
  requestType: RequestType,
  requestText: string,
): Promise<NextScreen> {
  const t = getLocale(mode);
  const typeName = t.requestTypeSelect.types[requestType];

  note(`[${typeName}]\n${requestText}`, t.requestConfirm.label);

  const action = await select({
    message: '',
    options: [
      { value: 'start',  label: t.requestConfirm.actions.start },
      { value: 'edit',   label: t.requestConfirm.actions.edit },
      { value: 'cancel', label: t.requestConfirm.actions.cancel },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'requestTypeSelect' };

  switch (action) {
    case 'start':
      return { screen: 'inReview', requestType, requestText };
    case 'edit':
      return { screen: 'requestInput', requestType };
    default:
      return { screen: 'requestTypeSelect' };
  }
}
