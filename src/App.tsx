import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { RectangularRoute } from './routes/RectangularRoute';
import { PolyominoRoute } from './routes/PolyominoRoute';
// Strict-model tabs. Everything they need lives under src/strict/; deleting that folder
// and the four lines below (two imports, two NavLinks, two Routes) reverts this file.
import { RectangularBaseStrict } from './strict/tabs/RectangularBaseStrict';
import { PolyominoStrict } from './strict/tabs/PolyominoStrict';

function App() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Header with tabs */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-semibold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
              Trimer Fingerprint Playground
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explore fingerprint-based reachability tests for trimer tilings
            </p>
          </div>
          <nav className="flex gap-1">
            <NavLink
              to="/rectangular"
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold border-b-2 border-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Rectangular Base
            </NavLink>
            <NavLink
              to="/polyomino"
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold border-b-2 border-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Polyomino Base
            </NavLink>
            <NavLink
              to="/rectangular-strict"
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold border-b-2 border-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Rectangular Base
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                strict
              </span>
            </NavLink>
            <NavLink
              to="/polyomino-strict"
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold border-b-2 border-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Polyomino
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                strict
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Route content */}
      <Routes>
        <Route path="/rectangular" element={<RectangularRoute />} />
        <Route path="/polyomino" element={<PolyominoRoute />} />
        <Route path="/rectangular-strict" element={<RectangularBaseStrict />} />
        <Route path="/polyomino-strict" element={<PolyominoStrict />} />
        <Route path="*" element={<Navigate to="/rectangular" replace />} />
      </Routes>
    </div>
  );
}

export default App;
