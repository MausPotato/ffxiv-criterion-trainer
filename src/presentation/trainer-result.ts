export function trainerResultLabel(succeeded: boolean): '成功' | '失敗' {
  return succeeded ? '成功' : '失敗';
}

export function trainerResultStatus(succeeded: boolean): '✓ 成功' | '× 失敗' {
  return succeeded ? '✓ 成功' : '× 失敗';
}
