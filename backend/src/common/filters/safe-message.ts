const TECHNICAL =
  /prisma|p20\d\d|stack|node_modules|econn|enotfound|sql|postgres|syntax error|typeerror|referenceerror|cannot read|undefined|jwt|secret|exception|internal server|at \w+\s*\(|\/src\/|\\src\\|trigger|violates|constraint/i;

export function looksTechnical(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 280) return true;
  return TECHNICAL.test(value);
}
