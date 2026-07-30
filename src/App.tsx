import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ProblemPage } from './pages/ProblemPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/problem/:problemId" element={<ProblemPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
