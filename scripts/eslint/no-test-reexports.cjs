module.exports = {
  rules: {
    'no-test-reexports': {
      meta: { 
        type: 'problem', 
        docs: { 
          description: 'Prevent test files from being re-exported through public barrel' 
        } 
      },
      create(ctx) {
        if (!ctx.getFilename().includes('src/browser/public.ts')) return {};
        return {
          ExportNamedDeclaration(node) {
            const source = node.source?.value ?? '';
            if (source.includes('__tests__') || source.includes('/fixtures/')) {
              ctx.report({ 
                node, 
                message: 'Do not re-export test files or fixtures through public barrel' 
              });
            }
          },
        };
      },
    },
  },
};