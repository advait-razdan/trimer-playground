/** §5.0.5 "Why does this shape have these fingerprints?" templates. */

export type ShapeCategory = 'rectangle' | 'strip' | 'no-bridges' | 'has-bridges';

export interface ShapeWhyTemplate {
  category: ShapeCategory;
  text: string;
}

export const shapeWhyTemplates: Record<ShapeCategory, string> = {
  rectangle:
    'Rectangles are the simplest case \u2014 F1, F2, F3, F4 are always exactly enough. No extras, no collapses. This is the case the Rectangular Base tab handles.',
  strip:
    'Single-row (or single-column) shapes lose one or two of the canonicals. {collapsed} collapse{s} because every cell has {coord} = 0. The word is just ({surviving}).',
  'no-bridges':
    'This shape has no thin (width-1) bridges between fat lobes, so F1\u2013F4 alone are enough. The program checked the null space and confirmed no extras exist for this shape.',
  'has-bridges':
    'This shape has {N} width-1 fat bridge{s}. Each one creates 2 extras (this is an empirical rule, not yet proven). The extras live mostly on the lobes \u2014 the bridge can\u2019t cancel certain local mod-3 patterns. Total extras: {total}.',
};

export const shapeWhyFooter =
  'Want the full details? See the glossary entries for bridge, fat bridge, lobe, and collapsed canonical.';

/**
 * Build the "why" text for a specific shape, filling in template placeholders.
 */
export function buildShapeWhyText(params: {
  category: ShapeCategory;
  collapsed?: string[];
  surviving?: string[];
  coord?: string;
  bridgeCount?: number;
}): string {
  const template = shapeWhyTemplates[params.category];

  if (params.category === 'strip') {
    const collapsed = (params.collapsed ?? []).join(', ');
    const surviving = (params.surviving ?? []).join(', ');
    const s = (params.collapsed?.length ?? 0) === 1 ? 's' : '';
    return template
      .replace('{collapsed}', collapsed)
      .replace('{s}', s)
      .replace('{coord}', params.coord ?? 'i')
      .replace('{surviving}', surviving);
  }

  if (params.category === 'has-bridges') {
    const n = params.bridgeCount ?? 0;
    return template
      .replace('{N}', String(n))
      .replace('{s}', n === 1 ? '' : 's')
      .replace('{total}', String(n * 2));
  }

  return template;
}
