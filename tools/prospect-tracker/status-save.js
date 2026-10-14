import { validateStatus } from './model.js';

/** One save gate for editor and board, using the existing data layer unchanged.
 * @param {Pick<ReturnType<typeof import('./data.js').createRadarDataAccess>, 'changeStatus'>} data
 * @param {{canSave:()=>boolean, busy:(value:boolean)=>void}} options */
export function createStatusSaver(data, options) {
  let saving = false;
  /** @param {Pick<import('./model.js').Prospect,'id'|'updated_at'>} prospect
   * @param {import('./model.js').ProspectStatus} status */
  return async (prospect, status) => {
    if (saving || !options.canSave()) throw new Error('Wait for the current save or sign in before changing status.');
    saving = true; options.busy(true);
    try { return await data.changeStatus(prospect.id, validateStatus(status), prospect.updated_at); }
    finally { saving = false; options.busy(false); }
  };
}
