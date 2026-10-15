const { HttpError, conflict } = require('../../utils/http-error');

function validationDetails(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message || 'Invalid value.',
  }));
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed.', validationDetails(result.error));
  }
  return result.data;
}

function paginationMeta(rows, page, pageSize) {
  const total = rows.length ? Number(rows[0].total_count) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function stripCount(row) {
  if (!row) return row;
  const { total_count: ignored, ...record } = row;
  return record;
}

function handleDatabaseError(error, duplicateMessage = 'A record with those unique values already exists.') {
  if (error?.code === '23505') throw conflict(duplicateMessage);
  if (error?.code === '23503') throw new HttpError(409, 'This change references a missing record or would break existing relationships.');
  if (error?.code === '23514' || error?.code === '22P02') throw new HttpError(400, 'The submitted values are inconsistent.');
  throw error;
}

function boolQuery(value) {
  if (value === undefined || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new HttpError(400, 'Boolean query value must be true or false.');
}

module.exports = {
  boolQuery,
  handleDatabaseError,
  paginationMeta,
  parse,
  stripCount,
};
