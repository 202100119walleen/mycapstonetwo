// src/components/Layout.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaTachometerAlt, FaBoxOpen, FaCheck, FaFileAlt, FaBarcode, FaCog } from 'react-icons/fa';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation(); // Get current URL path

  return (
    <div className="layout-container">
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <img src="spclayoutlogo.png" alt="SPC Logo" className="logolayout" />
          <h2 className="system-namelayout">SIMS</h2>
        </div>
        <Link
          to="/dashboard"
          className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
        >
          <FaTachometerAlt className="nav-icon" /> Dashboard
        </Link>
        <Link
          to="/manage-item"
          className={`nav-link ${location.pathname === "/manage-item" ? "active" : ""}`}
        >
          <FaBoxOpen className="nav-icon" /> Manage Item
        </Link>
        <Link
          to="/approve-request"
          className={`nav-link ${location.pathname === "/approve-request" ? "active" : ""}`}
        >
          <FaCheck className="nav-icon" /> Approved Purchased Request
        </Link>
        <Link
          to="/reports"
          className={`nav-link ${location.pathname === "/reports" ? "active" : ""}`}
        >
          <FaFileAlt className="nav-icon" /> Reports
        </Link>
        <Link
          to="/scanner"
          className={`nav-link ${location.pathname === "/scanner" ? "active" : ""}`}
        >
          <FaBarcode className="nav-icon" /> Scanner
        </Link>
        <Link
          to="/settings"
          className={`nav-link ${location.pathname === "/settings" ? "active" : ""}`}
        >
          <FaCog className="nav-icon" /> Settings
        </Link>
      </nav>
      <div className="content">
        {children}
      </div>
    </div>
  );
};

export default Layout;
