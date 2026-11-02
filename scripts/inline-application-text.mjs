/** Compile typed catalog reads into ordinary JS expressions for production bundles. */
import ts from 'typescript';

export function createTextCompiler(canonicalSource) {
  const original = ts.createSourceFile(
    'text.ts',
    canonicalSource,
    ts.ScriptTarget.Latest,
    true,
  );
  if (
    original.statements.some(
      (node) => ts.isImportDeclaration(node) || ts.isExportDeclaration(node),
    )
  )
    throw new Error(
      'The canonical text source must be browser-safe and self-contained.',
    );
  const javascript = ts.transpileModule(canonicalSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const source = ts.createSourceFile(
    'text.js',
    javascript,
    ts.ScriptTarget.Latest,
    true,
  );
  const bindings = new Map(),
    exported = new Set();
  for (const statement of source.statements)
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
          continue;
        bindings.set(declaration.name.text, declaration.initializer);
        if (
          statement.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          )
        )
          exported.add(declaration.name.text);
      }
  const printer = ts.createPrinter();
  const resolved = new Map();
  function resolve(name, resolving = new Set()) {
    if (resolved.has(name)) return resolved.get(name);
    if (resolving.has(name))
      throw new Error('Circular canonical text binding: ' + name);
    const pending = new Set(resolving).add(name);
    const result = ts.transform(bindings.get(name), [
      (context) => {
        function visit(node, bound = new Set()) {
          if (
            ts.isIdentifier(node) &&
            !bound.has(node.text) &&
            bindings.has(node.text)
          ) {
            const parent = node.parent;
            if (
              !(
                ts.isPropertyAccessExpression(parent) && parent.name === node
              ) &&
              !(ts.isPropertyAssignment(parent) && parent.name === node)
            )
              return resolve(node.text, pending);
          }
          if (ts.isArrowFunction(node)) {
            const local = new Set(bound);
            for (const parameter of node.parameters)
              if (ts.isIdentifier(parameter.name))
                local.add(parameter.name.text);
            return ts.visitEachChild(
              node,
              (child) => visit(child, local),
              context,
            );
          }
          return ts.visitEachChild(
            node,
            (child) => visit(child, bound),
            context,
          );
        }
        return (node) => visit(node);
      },
    ]);
    const node = result.transformed[0];
    resolved.set(name, node);
    result.dispose();
    return node;
  }
  function expression(name, members = []) {
    if (!exported.has(name))
      throw new Error('Unknown canonical text export: ' + name);
    let node = resolve(name),
      suffix = '';
    for (const member of members) {
      const property =
        ts.isObjectLiteralExpression(node) &&
        node.properties.find((p) => p.name?.getText(source) === member);
      if (property && ts.isPropertyAssignment(property))
        node = property.initializer;
      else suffix += '.' + member;
    }
    return (
      '(' +
      printer.printNode(ts.EmitHint.Expression, node, source) +
      ')' +
      suffix
    );
  }
  return function inline(code, file = 'view.tsx') {
    const parsed = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    const namespaces = new Set();
    for (const statement of parsed.statements)
      if (
        ts.isImportDeclaration(statement) &&
        statement.importClause?.namedBindings &&
        ts.isNamespaceImport(statement.importClause.namedBindings) &&
        /^appText\d*$/u.test(statement.importClause.namedBindings.name.text) &&
        (/^@clog\/domain$/u.test(statement.moduleSpecifier.text) ||
          /(?:^|\/)text\.[jt]s$/u.test(statement.moduleSpecifier.text))
      )
        namespaces.add(statement.importClause.namedBindings.name.text);
    if (!namespaces.size) return null;
    const edits = [];
    function visit(node, shadowed = new Set()) {
      if (ts.isImportDeclaration(node) || ts.isTypeNode(node)) return;
      let local = shadowed;
      if (ts.isFunctionLike(node) || ts.isBlock(node)) {
        local = new Set(shadowed);
        const bind = (name) => {
          if (ts.isIdentifier(name)) local.add(name.text);
          else
            for (const element of name.elements)
              if (ts.isBindingElement(element)) bind(element.name);
        };
        if (ts.isFunctionLike(node))
          for (const parameter of node.parameters) bind(parameter.name);
        if (ts.isBlock(node))
          for (const statement of node.statements) {
            if (ts.isVariableStatement(statement))
              for (const declaration of statement.declarationList.declarations)
                bind(declaration.name);
            else if (ts.isFunctionDeclaration(statement) && statement.name)
              bind(statement.name);
          }
      }
      if (ts.isPropertyAccessExpression(node)) {
        const names = [];
        let root = node;
        while (ts.isPropertyAccessExpression(root)) {
          names.unshift(root.name.text);
          root = root.expression;
        }
        if (
          ts.isIdentifier(root) &&
          namespaces.has(root.text) &&
          !local.has(root.text)
        ) {
          edits.push({
            start: node.getStart(parsed),
            end: node.end,
            text: expression(names[0], names.slice(1)),
          });
          return;
        }
      }
      if (
        ts.isIdentifier(node) &&
        namespaces.has(node.text) &&
        !local.has(node.text)
      )
        throw new Error(
          'Use direct canonical text members instead of spreading or dynamically reading the catalog.',
        );
      ts.forEachChild(node, (child) => visit(child, local));
    }
    visit(parsed);
    if (!edits.length) return null;
    let output = code;
    for (const edit of edits.sort((a, b) => b.start - a.start))
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    return output;
  };
}

export function applicationTextPlugin(source) {
  const inline = createTextCompiler(source);
  return {
    name: 'canonical-application-text',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      const file = id.replaceAll('\\', '/');
      if (
        !/\.(?:tsx?|jsx?)(?:\?|$)/u.test(file) ||
        (!file.includes('/apps/web/src/') &&
          !file.includes('/packages/domain/dist/'))
      )
        return null;
      const output = inline(code, file.split('?')[0]);
      return output === null ? null : { code: output, map: null };
    },
  };
}
