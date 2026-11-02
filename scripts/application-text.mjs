/** Focused authored-copy inventory; protocol strings and external data stay in code. */
import ts from 'typescript';

export const textAttributes = new Set([
  'alt',
  'title',
  'placeholder',
  'aria-label',
  'aria-description',
  'label',
  'caption',
  'description',
  'unit',
  'help',
]);
const machineAttributes = new Set([
  'className',
  'id',
  'type',
  'role',
  'src',
  'href',
  'rel',
  'target',
  'htmlFor',
  'name',
  'value',
  'autoComplete',
  'loading',
  'style',
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-live',
  'aria-current',
  'aria-hidden',
  'aria-busy',
  'aria-pressed',
  'aria-expanded',
  'data-testid',
]);
const messageCalls =
  /^(?:Error|.*Error|setDescription|setTitle|setLabel|setPlaceholder|setError|setMessage|setNotice|editReply|reply|confirm|alert|warn|error|info|log)$/u;

export function jsxWords(value) {
  const lines = value.split(/\r\n|\n|\r/u);
  let last = 0;
  lines.forEach((line, index) => {
    if (/[^ \t]/u.test(line)) last = index;
  });
  return lines
    .map((line, index) => {
      let text = line.replace(/\t/gu, ' ');
      if (index > 0) text = text.replace(/^ +/u, '');
      if (index < lines.length - 1) text = text.replace(/ +$/u, '');
      return text && index < last ? text + ' ' : text;
    })
    .join('');
}

function enclosingAttribute(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return p.name.getText();
    if (ts.isStatement(p) || ts.isJsxElement(p) || ts.isFunctionLike(p)) break;
  }
}

export function machineReason(node, source) {
  const parent = node.parent;
  if (!parent) return 'Source file';
  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isImportTypeNode(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isModuleDeclaration(parent) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    ts.isElementAccessExpression(parent)
  )
    return 'Type, module or property identifier';
  const attr = enclosingAttribute(node);
  if (
    attr &&
    (machineAttributes.has(attr) ||
      attr.startsWith('data-') ||
      (attr.startsWith('aria-') && !textAttributes.has(attr)) ||
      [
        'in',
        'in2',
        'result',
        'filter',
        'fill',
        'stroke',
        'viewBox',
        'xmlns',
        'd',
        'operator',
        'mode',
      ].includes(attr))
  )
    return 'Non-text JSX attribute contract';
  const value = ts.isTemplateExpression(node)
    ? node.head.text +
      node.templateSpans.map((span) => span.literal.text).join('')
    : node.text;
  if (value === undefined) return undefined;
  // The pinned legacy taxonomy correction and its immutable audit reason are
  // historical import evidence, rather than editable runtime wording.
  if (
    source.fileName
      .replaceAll('\\', '/')
      .endsWith('packages/database/src/clue-taxonomy.ts') &&
    [
      'Rare',
      'Correct Treasure Trails (Rare) membership from pinned OSRS Wiki collection log',
    ].includes(value)
  )
    return 'Pinned legacy taxonomy/audit evidence';
  if (
    /^(?:[A-Z][a-z]+)*(?:Error|Exception)$/u.test(value) ||
    /^Arrow(?:Up|Down|Left|Right)$/u.test(value)
  )
    return 'Standard error name or keyboard event identifier';
  if (
    /^[a-z][a-z-]*:[^\s]+$/u.test(value) ||
    /; Path=\/; HttpOnly;/u.test(value)
  )
    return 'Opaque namespace or cookie wire format';
  if (
    /^(?:\.{0,2}\/|https?:\/\/|postgres(?:ql)?:\/\/|image\/|text\/|application\/)/u.test(
      value.trim(),
    )
  )
    return 'Route, module, asset, URL or media type';
  if (/^[\w.-]+\.(?:webp|png|jpg|json|ts|js|mjs|sql|html|css)$/u.test(value))
    return 'Filename';
  if (/^(?:rgba?|hsla?|calc|url|translate[XY]?|rotate)\(/u.test(value))
    return 'CSS function';
  if (
    /^(?:SELECT|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|WITH|GRANT|REVOKE|TRUNCATE|EXPLAIN|SET|SHOW|LOCK|BEGIN|COMMIT|ROLLBACK|DO)\b/u.test(
      value.trim(),
    ) ||
    /\b(?:AS|FROM|WHERE|RETURNING|ORDER BY|LEFT JOIN|IS NULL)\b|::(?:text|int|jsonb|date)/u.test(
      value,
    )
  )
    return 'SQL statement or projection';
  for (
    let current = node;
    current.parent && !ts.isStatement(current);
    current = current.parent
  ) {
    const p = current.parent;
    if (
      ts.isPropertyAssignment(p) &&
      /^(?:authorization|Authorization|Accept|'User-Agent'|"User-Agent")$/u.test(
        p.name.getText(source),
      )
    )
      return 'HTTP request header wire format';
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      p.expression.name.text === 'query' &&
      p.arguments[0] === current
    )
      return 'SQL query argument';
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      /^(header|setHeader|getHeader|removeHeader)$/u.test(
        p.expression.name.text,
      )
    )
      return 'HTTP header contract';
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      /^(get|set|has|append|delete)$/u.test(p.expression.name.text) &&
      /headers$/iu.test(p.expression.expression.getText(source))
    )
      return 'HTTP header collection';
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      /^(querySelector|querySelectorAll|closest|matches)$/u.test(
        p.expression.name.text,
      )
    )
      return 'DOM selector';
    if (
      ts.isNewExpression(p) &&
      p.expression.getText(source) === 'UnconfirmedSubmissionError'
    )
      return 'Receipt reconciliation reason identifier';
  }
  if (
    ts.isCallExpression(parent) &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword
  )
    return 'Dynamic module identifier';
  // Comparison operands retain IDs/names supplied by protocols and imported catalogs.
  // Authored error comparisons are sentences, so they remain part of the inventory.
  if (
    ts.isBinaryExpression(parent) &&
    [
      'read committed',
      'repeatable read',
      'serializable',
      'read uncommitted',
    ].includes(value) &&
    /\.isolation$/u.test(parent.left.getText(source))
  )
    return 'PostgreSQL transaction isolation identifier';
  if (
    ts.isBinaryExpression(parent) &&
    [
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ].includes(parent.operatorToken.kind) &&
    !/[.!?]$/u.test(value) &&
    !/\s/u.test(value)
  )
    return 'Machine/external comparison value';
  return undefined;
}

export function isAuthoredLiteral(node, source) {
  if (!(
    ts.isJsxText(node) ||
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node)
  ))
    return false;
  if (machineReason(node, source)) return false;
  if (ts.isJsxText(node)) return Boolean(jsxWords(node.text).trim());
  if (!(
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node)
  ))
    return false;
  const attr = enclosingAttribute(node);
  if (attr && textAttributes.has(attr))
    return Boolean((node.text ?? node.getText(source)).trim());
  const value = ts.isTemplateExpression(node)
    ? node.head.text + node.templateSpans.map((s) => s.literal.text).join('')
    : node.text;
  const parent = node.parent;
  if (
    ts.isPropertyAssignment(parent) &&
    /^(?:label|description|title|caption|error|message|placeholder|help)$/u.test(
      parent.name.getText(source),
    ) &&
    /[A-Za-z]/u.test(value)
  )
    return true;
  for (
    let current = node;
    current.parent && !ts.isStatement(current);
    current = current.parent
  ) {
    const call = current.parent;
    if (
      ts.isCallExpression(call) &&
      ts.isPropertyAccessExpression(call.expression) &&
      ts.isIdentifier(call.expression.expression) &&
      (/Text$/u.test(call.expression.expression.text) ||
        /^appText\d*$/u.test(call.expression.expression.text)) &&
      /[A-Za-z]/u.test(value)
    )
      return true;
  }
  let rendered = node;
  while (
    rendered.parent &&
    ((ts.isConditionalExpression(rendered.parent) &&
      rendered.parent.condition !== rendered) ||
      ts.isParenthesizedExpression(rendered.parent))
  )
    rendered = rendered.parent;
  if (
    ts.isJsxExpression(rendered.parent) &&
    !ts.isJsxAttribute(rendered.parent.parent) &&
    Boolean(value.trim())
  )
    return true;
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const name = ts.isPropertyAccessExpression(parent.expression)
      ? parent.expression.name.text
      : parent.expression.getText(source);
    if (messageCalls.test(name) && /[A-Za-z]/u.test(value)) return true;
  }
  return (
    /[A-Za-z]/u.test(value) &&
    (/[A-Za-z][ ,!?:;\n][A-Za-z ]|[a-z] [a-z]|[a-z][.!?]$|^[A-Z][a-z]/u.test(
      value.trim(),
    ) ||
      (ts.isTemplateExpression(node) &&
        /[A-Za-z]/u.test(value) &&
        /\s/u.test(value)))
  );
}

export function findAuthoredText(source) {
  const found = [];
  function visit(node) {
    if (isAuthoredLiteral(node, source)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}
