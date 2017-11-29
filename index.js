module.exports = function ({ types: t, template }) {
  const visited = Symbol('visited')
  const importCssId = Symbol('importCssId')
  const loadTemplate = template(
    'Promise.all([IMPORT, IMPORT_CSS(MODULE)]).then(proms => proms[0])'
  )
  const getImportArgPath = p => p.parentPath.get('arguments')[0]
  const trimChunkName = baseDir => baseDir.replace(/^[./]+|(\.js$)/g, '')

  function getImportCss(p) {
    if (!p.hub.file[importCssId]) {
      const importCss = p.hub.file.addImport(
        'babel-plugin-dual-import/importCss.js',
        'default',
        'importCss'
      )
      p.hub.file[importCssId] = importCss
    }

    return p.hub.file[importCssId]
  }

  function getMagicCommentChunkName(importArgNode) {
    if (!importArgNode.leadingComments[0]) {
      throw new Error(`expected a magic comment for ${importArgNode.value}`)
    }
    
    return importArgNode.leadingComments[0].value.match(
      /webpackChunkName: ['"](.*)['"]/
    )[1]
  }

  function promiseAll(p) {
    const argPath = getImportArgPath(p)
    const importArgNode = argPath.node
    const chunkName = getMagicCommentChunkName(importArgNode)

    return loadTemplate({
      IMPORT: argPath.parent,
      IMPORT_CSS: getImportCss(p),
      MODULE: {
        type: 'StringLiteral',
        value: chunkName
      }
    }).expression
  }

  return {
    name: 'dual-import',
    visitor: {
      Import(p) {
        if (p[visited]) return
        p[visited] = true
        p.parentPath.replaceWith(promiseAll(p))
      }
    }
  }
}
