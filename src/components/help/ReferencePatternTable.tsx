import { referencePatternTable } from '../../content/reference-pattern-table';

export function ReferencePatternTable() {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-1 pr-2 font-semibold text-gray-700">Shape</th>
            <th className="text-right py-1 px-2 font-semibold text-gray-700">Cells</th>
            <th className="text-right py-1 px-2 font-semibold text-gray-700">Word len</th>
            <th className="text-right py-1 px-2 font-semibold text-gray-700">Canonical</th>
            <th className="text-right py-1 pl-2 font-semibold text-gray-700">Extras</th>
          </tr>
        </thead>
        <tbody>
          {referencePatternTable.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1 pr-2 text-gray-700">
                {row.shape}
              </td>
              <td className="py-1 px-2 text-right font-mono text-gray-600">{row.cells}</td>
              <td className="py-1 px-2 text-right font-mono text-gray-600">{row.wordLen}</td>
              <td className="py-1 px-2 text-right font-mono text-gray-600">
                {row.canonical}
                {row.canonicalNote && (
                  <span className="text-gray-400 ml-1">({row.canonicalNote})</span>
                )}
              </td>
              <td className={`py-1 pl-2 text-right font-mono ${row.extras > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {row.extras}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
