import { loadServerEnv } from '@bilgim/domain';
import type { ServerEnv } from '@bilgim/domain';
import type { Provider } from '@nestjs/common';

export const ENV = Symbol('ENV');

export type Env = ServerEnv;

/**
 * Muhit bitta nuqtada parse qilinadi; validatsiya xatosi jarayonni darhol
 * to'xtatadi (fail-closed). Secret'lar bu provider orqali DI bilan beriladi,
 * hech qachon logga yozilmaydi (docs/bilgim2.0.md §9).
 */
export const envProvider: Provider = {
  provide: ENV,
  useFactory: () => loadServerEnv(),
};
