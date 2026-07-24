/**
 * Custom ESLint rule: no-tailwind-directional
 *
 * Fails when a Tailwind class on the inline (horizontal) axis assumes
 * a fixed left/right direction. Use logical-property utilities instead so
 * the same component renders correctly in both LTR and RTL:
 *
 *   ml-*    -> ms-*           border-l-* -> border-s-*
 *   mr-*    -> me-*           border-r-* -> border-e-*
 *   pl-*    -> ps-*           rounded-l-* / rounded-tl-* -> rounded-s-* / rounded-ss-*
 *   pr-*    -> pe-*           rounded-r-* / rounded-tr-* -> rounded-e-* / rounded-se-*
 *   left-*  -> start-*        rounded-bl-* / rounded-br-* -> rounded-es-* / rounded-ee-*
 *   right-* -> end-*          float-left   -> float-start
 *   text-left  -> text-start  float-right  -> float-end
 *   text-right -> text-end
 *
 * Checked inside:
 *   - JSX  `className="..."` (string literals and template literals)
 *   - calls to `cn(...)`, `clsx(...)`, `twMerge(...)`, `classNames(...)`
 *     with string-literal or template-literal arguments
 *
 * Does NOT inspect dynamically computed class names — those are caller's
 * responsibility. The block-axis utilities (top-*, bottom-*, my-*, py-*,
 * border-y-*) and the inline shorthand utilities (mx-*, px-*, inset-x-*)
 * are direction-agnostic and remain allowed.
 */

const RULES = [
  {
    regex: /\bm[lr]-/,
    fix: 'ms-* / me-*',
    label: 'margin-left / margin-right',
  },
  {
    regex: /\bp[lr]-/,
    fix: 'ps-* / pe-*',
    label: 'padding-left / padding-right',
  },
  {
    regex: /(^|\s|:|\[)(left|right)-/,
    fix: 'start-* / end-*',
    label: 'left-* / right-* positioning',
  },
  {
    regex: /\bborder-[lr](?=-|\b)/,
    fix: 'border-s-* / border-e-*',
    label: 'border-l-* / border-r-*',
  },
  {
    regex: /\brounded-(?:[lr]|tl|tr|bl|br)(?=-|\b)/,
    fix: 'rounded-s-* / rounded-e-* / rounded-ss-* / rounded-se-* / rounded-es-* / rounded-ee-*',
    label: 'rounded-{l,r,tl,tr,bl,br}-*',
  },
  {
    regex: /\btext-(?:left|right)\b/,
    fix: 'text-start / text-end',
    label: 'text-left / text-right',
  },
  {
    regex: /\bfloat-(?:left|right)\b/,
    fix: 'float-start / float-end',
    label: 'float-left / float-right',
  },
  {
    regex: /\bclear-(?:left|right)\b/,
    fix: 'clear-start / clear-end',
    label: 'clear-left / clear-right',
  },
];

function checkString(node, value, context) {
  if (typeof value !== 'string' || value.length === 0) return;
  for (const { regex, fix, label } of RULES) {
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let match;
    while ((match = globalRegex.exec(value)) !== null) {
      context.report({
        node,
        message:
          `Avoid direction-specific Tailwind utility "${match[0].trim()}" (${label}). ` +
          `Use ${fix} for RTL safety.`,
      });
    }
  }
}

function checkExpression(node, expr, context) {
  if (!expr) return;
  if (expr.type === 'Literal') {
    checkString(node, expr.value, context);
  } else if (expr.type === 'TemplateLiteral') {
    for (const q of expr.quasis) {
      checkString(node, q.value.cooked ?? q.value.raw ?? '', context);
    }
  }
}

const HELPER_NAMES = new Set(['cn', 'clsx', 'classnames', 'classNames', 'twMerge', 'cva']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Tailwind classes that assume a fixed left/right direction. Use logical-property utilities (start/end, ms/me/ps/pe, border-s/e, rounded-s/e, etc.) for RTL safety.',
    },
    schema: [],
    messages: {},
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') return;
        const v = node.value;
        if (!v) return;
        if (v.type === 'Literal') {
          checkString(node, v.value, context);
        } else if (v.type === 'JSXExpressionContainer') {
          checkExpression(node, v.expression, context);
        }
      },

      CallExpression(node) {
        if (!node.callee || node.callee.type !== 'Identifier') return;
        if (!HELPER_NAMES.has(node.callee.name)) return;
        for (const arg of node.arguments) {
          checkExpression(node, arg, context);
        }
      },
    };
  },
};
