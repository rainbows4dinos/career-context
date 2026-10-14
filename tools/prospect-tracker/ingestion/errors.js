export class IngestionError extends Error {
  /** @param {string} code @param {string} message @param {number} [status] */
  constructor(code, message, status = 400) {
    super(message); this.name = 'IngestionError'; this.code = code; this.status = status;
  }
}
