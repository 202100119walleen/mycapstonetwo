import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config'; // Adjust the import based on your project structure
import { jsPDF } from 'jspdf'; // Import jsPDF
import 'jspdf-autotable';
import './Reports.css'; // Import the CSS file

const categories = ["Equipment", "Office Supplies", "Books", "Electrical Parts"];

const ReportPage = () => {
  const [requests, setRequests] = useState([]);
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [visibleDepartments, setVisibleDepartments] = useState({});
  const [summary, setSummary] = useState({ totalRequests: 0, totalAmount: 0 });

  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(fetchedRequests);
      setLoading(false);
      calculateSummary(fetchedRequests);
    }, (error) => {
      console.error("Error fetching requests: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const archiveCollection = collection(db, 'archive');
    const unsubscribeArchive = onSnapshot(archiveCollection, (snapshot) => {
      const fetchedArchivedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArchivedRequests(fetchedArchivedRequests);
    }, (error) => {
      console.error("Error fetching archived requests: ", error);
    });
    return () => unsubscribeArchive();
  }, []);

  const calculateSummary = (requests) => {
    const totalRequests = requests.length;
    const totalAmount = requests.reduce((total, request) => {
      const requestTotal = request.itemName && Array.isArray(request.itemName)
        ? request.itemName.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0)
        : 0;
      return total + requestTotal;
    }, 0);
    
    setSummary({ totalRequests, totalAmount });
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
  };

  const sortRequests = (requests) => {
    const sortedRequests = [...requests];
    switch (sortOption) {
      case 'year':
        return sortedRequests.filter(request => new Date(request.requestDate).getFullYear() === selectedYear);
      case 'quarter':
        return sortedRequests.sort((a, b) => {
          const quarterA = Math.floor(new Date(a.requestDate).getMonth() / 3);
          const quarterB = Math.floor(new Date(b.requestDate).getMonth() / 3);
          return quarterB - quarterA || new Date(b.requestDate) - new Date(a.requestDate);
        });
      case 'semester':
        return sortedRequests.sort((a, b) => {
          const semesterA = Math.floor(new Date(a.requestDate).getMonth() / 6);
          const semesterB = Math.floor(new Date(b.requestDate).getMonth() / 6);
          return semesterB - semesterA || new Date(b.requestDate) - new Date(a.requestDate);
        });
      case '6months':
        return sortedRequests.sort((a, b) => {
          const monthA = Math.floor(new Date(a.requestDate).getMonth() / 6);
          const monthB = Math.floor(new Date(b.requestDate).getMonth() / 6);
          return monthB - monthA || new Date(b.requestDate) - new Date(a.requestDate);
        });
      default:
        return sortedRequests;
    }
  };

  const filteredRequests = () => {
    return requests.filter(request => {
      const requestDate = new Date(request.requestDate);
      const matchesSearchTerm = 
        (request.uniqueId && request.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.college && request.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.department && request.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.category && request.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDateRange = 
        (!startDate || requestDate >= new Date(startDate)) &&
        (!endDate || requestDate <= new Date(endDate));

      const matchesCategory = !selectedCategory || request.category === selectedCategory;

      return matchesSearchTerm && matchesDateRange && matchesCategory;
    });
  };

  const copyToClipboard = (uniqueId) => {
    navigator.clipboard.writeText(uniqueId).then(() => {
      alert("Unique ID copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  };

  const generateAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Report of All Requests", 10, 10);
  
    const allRequests = sortRequests(filteredRequests());
    const tableData = [];
  
    allRequests.forEach((request) => {
      const totalAmount = request.itemName && Array.isArray(request.itemName)
        ? request.itemName.reduce((total, item) => total + (parseFloat(item.totalAmount) || 0), 0)
        : 0;
  
      // If there are items, create a row for each item
      if (request.itemName && Array.isArray(request.itemName) && request.itemName.length > 0) {
        request.itemName.forEach((item) => {
          tableData.push([
            request.uniqueId,
            request.requestPurpose,
            request.supplierName,
            new Date(request.requestDate).toLocaleDateString(),
            totalAmount.toFixed(2),
            request.category || 'N/A',
            request.department || 'N/A',
            item.name // Display each item's name in its own column
          ]);
        });
      } else {
        // If no items, still add a row with 'No Items'
        tableData.push([
          request.uniqueId,
          request.requestPurpose,
          request.supplierName,
          new Date(request.requestDate).toLocaleDateString(),
          totalAmount.toFixed(2),
          request.category || 'N/A',
          request.department || 'N/A',
          'No Items' // Indicate no items
        ]);
      }
    });
  
    // Define column headers
    const headers = [
      "Unique ID",
      "Request Purpose",
      "Supplier Name",
      "Request Date",
      "Total Amount",
      "Category",
      "Department",
      "Item Name" // Updated header for item names
    ];
  
    // Use autoTable to create the table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255] },
      margin: { top: 10 },
    });
  
    // Save the PDF
    doc.save("all_requests_report.pdf");
  };

  const archiveRequest = async (request) => {
    const archiveRef = doc(db, 'archive', request.id);
    await setDoc(archiveRef, request);
    await deleteDoc(doc(db, 'requests', request.id));
  };

  const restoreRequest = async (request) => {
    const requestRef = doc(db, 'requests', request.id);
    await setDoc(requestRef, request);
    await deleteDoc(doc(db, 'archive', request.id));
  };

  const deleteArchivedRequest = async (requestId) => {
    await deleteDoc(doc(db, 'archive', requestId));
  };

  const deleteRequest = async (requestId) => {
    await deleteDoc(doc(db, 'requests', requestId));
  };

  const groupRequestsByDepartment = (requests) => {
    const grouped = {};
    requests.forEach(request => {
      const department = request.department || 'Other';
      if (!grouped[department]) {
        grouped[department] = [];
      }
      grouped[department].push(request);
    });
    return grouped;
  };

  const groupRequestsByCategory = (requests) => {
    const grouped = {};
    requests.forEach(request => {
      const category = request.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(request);
    });
    return grouped;
  };

  const calculateTotalAmount = (requests) => {
    return requests.reduce((total, request) => {
      return total + (request.itemName && Array.isArray(request.itemName)
        ? request.itemName.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0)
        : 0);
    }, 0);
  };

  const renderGroupedRequests = () => {
    const groupedRequests = groupRequestsByDepartment(sortRequests(filteredRequests()));
    return Object.keys(groupedRequests).map(department => {
      const requests = groupedRequests[department];
      const isVisible = visibleDepartments[department] || false;

      return (
        <div key={department}>
          <h3 onClick={() => setVisibleDepartments(prev => ({ ...prev, [department]: !isVisible }))}>
            {department}
          </h3>
          {isVisible && (
            <>
              {Object.keys(groupRequestsByCategory(requests)).map(category => {
                const categoryRequests = groupRequestsByCategory(requests)[category];
                const totalAmount = calculateTotalAmount(categoryRequests);

                return (
                  <div key={category}>
                    <h4>{category}</h4>
                    {categoryRequests.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Unique ID</th>
                            <th>Request Purpose</th>
                            <th>Supplier Name</th>
                            <th>Request Date</th>
                            <th>Total Amount</th>
                            <th>Items Requested</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryRequests.map(request => (
                            <tr key={request.id}>
                              <td>
                                <span 
                                  style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                                  onClick={() => copyToClipboard(request.uniqueId)}
                                >
                                  {request.uniqueId}
                                </span>
                              </td>
                              <td>{request.requestPurpose}</td>
                              <td>{request.supplierName}</td>
                              <td>{new Date(request.requestDate).toLocaleDateString()}</td>
                              <td>{request.itemName && Array.isArray(request.itemName)
                                ? request.itemName.reduce((total, item) => total + (parseFloat(item.totalAmount) || 0), 0).toFixed(2)
                                : '0.00'}</td>
                              <td>
                                <ul>
                                  {request.itemName && Array.isArray(request.itemName) && request.itemName.length > 0 ? (
                                    request.itemName.map((item, index) => (
                                      <li key={index}>
                                        {item.name} - {item.quantity} requested, {item.purchasedQuantity} purchased
                                      </li>
                                    ))
                                  ) : (
                                    <li>No items requested.</li>
                                  )}
                                </ul>
                              </td>
                              <td>
                                <button onClick={() => archiveRequest(request)}>Archive</button>
                                <button onClick={() => deleteRequest(request.id)}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No requests found in this category.</p>
                    )}
                    <p>Total Amount for {category}: {totalAmount.toFixed(2)}</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      );
    });
  };

  const renderArchivedRequests = () => {
    return archivedRequests.map((request) => (
      <li key={request.id}>
        <p><strong>Unique ID:</strong> {request.uniqueId}</p>
        <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
        <p><strong>Supplier Name:</strong> {request.supplierName}</p>
        <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
        <p><strong>Category:</strong> {request.category || 'N/A'}</p>
        <p><strong>Department:</strong> {request.department || 'N/A'}</p>
        <button onClick={() => restoreRequest(request)}>Restore</button>
        <button onClick ={() => deleteArchivedRequest(request.id)}>Delete from Archive</button>
      </li>
    ));
  };

  return (
    <div className="report-page">
      <h1>Report of Requests</h1>
      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <>
          <div className="summary-report">
            <h2>Summary Report</h2>
            <p><strong>Total Requests:</strong> {summary.totalRequests}</p>
            <p><strong>Total Amount:</strong> {summary.totalAmount.toFixed(2)}</p>
          </div>

          <input 
            type="text" placeholder="Search by Unique ID, College, Department, Category" 
            value={searchTerm} 
            onChange={handleSearchChange} 
          />
          <div className="date-filters">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          <button onClick={clearFilters}>Clear Filters</button>
          <div className="sort-options">
            <label htmlFor="sort">Sort by:</label>
            <select id="sort" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="year">Year</option>
              <option value="quarter">Quarter</option>
              <option value="semester">Semester</option>
              <option value="6months">6 Months</option>
            </select>
            {sortOption === 'year' && (
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {[...Array(10)].map((_, index) => {
                  const year = new Date().getFullYear() - index;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            )}
          </div>

          <div className="category-filter">
            <label htmlFor="category">Filter by Category:</label>
            <select id="category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <button onClick={generateAllPDF}>Download All Reports</button>

          <h2>Current Requests</h2>
          {filteredRequests().length > 0 ? (
            renderGroupedRequests()
          ) : (
            <p>No requests found.</p>
          )}

          <h2>Archived Requests</h2>
          <ul>
            {archivedRequests.length > 0 ? (
              renderArchivedRequests()
            ) : (
              <p>No archived requests found.</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

export default ReportPage;