import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import GeneratorPage from './pages/GeneratorPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>Reddit AI Strategy</h1>
          <p>Search subreddits and generate AI-powered post and comment ideas</p>
        </header>

        <nav className="app-nav">
          <a href="/">Search</a>
          <a href="/generator">Generator</a>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/generator" element={<GeneratorPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
