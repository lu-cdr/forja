import * as gen from './plan.generated'

/**
 * Versão do plano da planilha. Subir a versão faz quem usa o modelo "Hipertrofia 5 dias"
 * SEM ter editado o plano receber a versão nova (ver ensureSeeded).
 */
export const SEED_VERSION = gen.SEED_VERSION

export { CATALOG, CATALOG_IDS, DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate, templateWeekdays } from './templates'
export type { PlanTemplate } from './templates'
