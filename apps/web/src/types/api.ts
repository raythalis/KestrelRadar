/** 与后端约定的错误分类（见 docs/grouped-ui-api-contract.md） */
export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'conflict'
  | 'unavailable_dependency'
  | 'network_error'
  | 'error'
