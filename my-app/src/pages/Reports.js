import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import './Reports.css';
import { FaFolder, FaFolderOpen } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Reports = () => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleFolders, setVisibleFolders] = useState({});
  const [visibleCategories, setVisibleCategories] = useState({});
  const [sortBy, setSortBy] = useState('dateAdded'); // Default sort by date added
  const [filterYear, setFilterYear] = useState(''); // Year filter
  const [startDate, setStartDate] = useState(''); // Date range start
  const [endDate, setEndDate] = useState(''); // Date range end

  useEffect(() => {
    const fetchItems = () => {
      const itemsCollection = collection(db, 'items');
      const unsubscribe = onSnapshot(itemsCollection, (snapshot) => {
        const fetchedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(fetchedItems);
      });

      return () => unsubscribe();
    };

    fetchItems();
  }, []);

  const filterItems = (items) => {
    const lowerCaseQuery = searchQuery.toLowerCase();

    let filteredItems = items.filter((item) => {
      const matchesSearchQuery =
        item.text.toLowerCase().includes(lowerCaseQuery) ||
        item.college?.toLowerCase().includes(lowerCaseQuery) ||
        item.department?.toLowerCase().includes(lowerCaseQuery) ||
        item.itemType.toLowerCase().includes(lowerCaseQuery);

      const matchesYear = filterYear ? new Date(item.requestedDate.seconds * 1000).getFullYear() === parseInt(filterYear) : true;

      const matchesDateRange =
        startDate && endDate
          ? new Date(item.requestedDate.seconds * 1000) >= new Date(startDate) && new Date(item.requestedDate.seconds * 1000) <= new Date(endDate)
          : true;

      return matchesSearchQuery && matchesYear && matchesDateRange;
    });

    // Sort the filtered items based on the selected sorting criteria
    filteredItems = sortItems(filteredItems);

    return filteredItems;
  };

  const sortItems = (itemsToSort) => {
    switch (sortBy) {
      case 'highestAmount':
        return [...itemsToSort].sort((a, b) => b.amount - a.amount); // Sort by highest amount
      case 'year':
        return [...itemsToSort].sort(
          (a, b) => new Date(b.requestedDate.seconds * 1000).getFullYear() - new Date(a.requestedDate.seconds * 1000).getFullYear()
        ); // Sort by year
      case 'dateAdded':
      default:
        return [...itemsToSort].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds); // Sort by most recent date added
    }
  };

  const groupItems = () => {
    const filteredItems = filterItems(items);
    const grouped = {
      'Non Academic': {
        'FINANCE': [],
        'OFFICE': [],
        'HUMAN RESOURCE': [],
        'LIBRARY': [],
        'MANAGEMENT INFORMATION SYSTEM': [],
        'OFFICE OF THE REGISTRAR': [],
        'OFFICE OF THE STUDENT AFFAIRS AND SERVICES': [],
        'RESEARCH AND CREATIVE WORKS': [],
        'ACCOUNTING': [],
        'CLINIC': [],
        'GUIDANCE': [],
        'NATIONAL SERVICE TRAINING PROGRAM': [],
        'WORKSHOP': []
      },
      'Academic': {
        'COLLEGE OF ARTS AND SCIENCES': [],
        'COLLEGE OF BUSINESS ADMINISTRATION': [],
        'COLLEGE OF COMPUTER STUDIES': [],
        'COLLEGE OF CRIMINOLOGY': [],
        'COLLEGE OF EDUCATION': [],
        'COLLEGE OF ENGINEERING': [],
        'BED': []
      }
    };

    filteredItems.forEach((item) => {
      if (item.category === 'Non Academic') {
        const departmentKey = item.subCategory || 'Unknown Department';
        if (grouped['Non Academic'][departmentKey]) {
          grouped['Non Academic'][departmentKey].push(item);
        }
      } else if (item.category === 'Academic') {
        const collegeKey = item.subCategory || 'Unknown College';
        if (!grouped['Academic'][collegeKey]) {
          grouped['Academic'][collegeKey] = [];
        }
        grouped['Academic'][collegeKey].push(item);
      } else if (item.category === 'BED') {
        grouped['Academic']['BED'].push(item);
      }
    });

    return grouped;
  };

  const handleToggleFolder = (folderKey) => {
    setVisibleFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const handleToggleCategory = (folderKey, categoryKey) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [folderKey]: {
        ...prev[folderKey],
        [categoryKey]: !prev[folderKey]?.[categoryKey],
      },
    }));
  };

  const downloadReport = (folderKey, categoryKey = null) => {
    const groupedItems = groupItems();
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Report Summary for ${folderKey}${categoryKey ? ` - ${categoryKey}` : ''}`, 14, 22);

    let grandTotal = 0;
    let currentY = 32;

    const categories = categoryKey ? { [categoryKey]: groupedItems[folderKey][categoryKey] } : groupedItems[folderKey];

    if (categories) {
      Object.keys(categories).forEach((key) => {
        const itemsInCategory = categories[key];
        if (itemsInCategory.length === 0) return; // Skip empty categories

        doc.setFontSize(14);
        doc.text(`Category: ${key} (Total Items: ${itemsInCategory.length})`, 14, currentY); // Show total items in category

        const tableData = itemsInCategory.map((item) => {
          const itemAmount = Number(item.amount) || 0; // Ensure amount is a number
          grandTotal += itemAmount;
          return [
            item.text,
            item.subCategory || 'N/A',
            item.program || 'N/A',
            item.quantity, // Display quantity as a number
            `₱${itemAmount.toFixed(2)}`, // Display amount with PHP currency format
            new Date(item.requestedDate.seconds * 1000).toLocaleDateString(),
            item.supplier || 'N/A',
            item.itemType || 'N/A'
          ];
        });

        currentY += 10;
        doc.autoTable({
          startY: currentY,
          head: [['Item Name', 'Sub-category', 'Program', 'Quantity', 'Amount (PHP)', 'Requested Date', 'Supplier', 'Type']],
          body: tableData,
        });

        currentY = doc.lastAutoTable.finalY + 10;
      });

      doc.setFontSize(14);
      doc.text(`Total Amount: ₱${grandTotal.toFixed(2)}`, 14, currentY + 10);
    } else {
      doc.text('No items found.', 14, 32);
    }

    doc.save(`${folderKey}${categoryKey ? `-${categoryKey}` : ''}-report-summary.pdf`);
  };

  const groupedItems = groupItems();
  const folderKeys = Object.keys(groupedItems);

  return (
    <div className="reports-container">
      <h1>
        <FaFolder className="folder-icon" /> Items Report
      </h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by item, college, department, or category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Sorting and Filtering Controls */}
      <div className="sort-bar">
        <label htmlFor="sort">Sort By:</label>
        <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="dateAdded">Date Added</option>
          <option value="year">Year</option>
          <option value="highestAmount">Highest Amount</option>
        </select>

        <label htmlFor="yearFilter">Filter by Year:</label>
        <input
          type="number"
          id="yearFilter"
          placeholder="Year"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        />

        <label htmlFor="startDate">Start Date:</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <label htmlFor="endDate">End Date:</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {folderKeys.map((folderKey) => (
        <div key={folderKey} className="report-section">
          <h2 onClick={() => handleToggleFolder(folderKey)}>
            {visibleFolders[folderKey] ? <FaFolderOpen /> : <FaFolder />} {folderKey}
          </h2>
          {visibleFolders[folderKey] && (
            <div className="folder-details">
              <button onClick={() => downloadReport(folderKey)} className="action-button">
                Download Summary for {folderKey}
              </button>
              {Object.keys(groupedItems[folderKey]).map((categoryKey) => {
                const itemsInCategory = groupedItems[folderKey][categoryKey];
                return itemsInCategory.length > 0 ? (
                  <div key={categoryKey}>
                    <h3 onClick={() => handleToggleCategory(folderKey, categoryKey)}>
                      {visibleCategories[folderKey]?.[categoryKey] ? <FaFolderOpen /> : <FaFolder />} {categoryKey} (Total Items: {itemsInCategory.length})
                    </h3>
                    {visibleCategories[folderKey]?.[categoryKey] && (
                      <div className="category-details">
                        <button
                          onClick={() => downloadReport(folderKey, categoryKey)}
                          className="action-button"
                        >
                          Download Summary for {categoryKey}
                        </button>
                        <ul>
                          {itemsInCategory.map((item) => (
                            <li key={item.id}>
                              <div><strong>Item Name:</strong> {item.text}</div>
                              <div><strong>Sub-category:</strong> {item.subCategory || 'N/A'}</div>
                              <div><strong>Program:</strong> {item.program || 'N/A'}</div>
                              <div><strong>Quantity:</strong> {item.quantity}</div>
                              <div><strong>Amount:</strong> ₱{Number(item.amount).toFixed(2)}</div> {/* Display amount in PHP format */}
                              <div><strong>Requested Date:</strong> {new Date(item.requestedDate.seconds * 1000).toLocaleDateString()}</div>
                              <div><strong>Supplier:</strong> {item.supplier || 'N/A'}</div>
                              <div><strong>Type:</strong> {item.itemType || 'N/A'}</div>
                              {item.image && <img src={item.image} alt="Item" className="report-image" />}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Reports;
