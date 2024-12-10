import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config'; // Adjust the import based on your project structure
import './Reports.css'; // Import the CSS file

const ReportPage = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch requests from Firestore on component mount
  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(fetchedRequests);
      setLoading(false); // Set loading to false after data is fetched
    }, (error) => {
      console.error("Error fetching requests: ", error);
      setLoading(false); // Set loading to false on error
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // Handle input changes
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  // Filter requests based on the unified search criteria
  const filteredRequests = () => {
    return requests.filter(request => {
      const requestDate = new Date(request.requestDate);
      const matchesSearchTerm = 
        (request.uniqueId && request.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.college && request.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.department && request.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.nonAcademicField && request.nonAcademicField.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDateRange = 
        (!startDate || requestDate >= new Date(startDate)) && 
        (!endDate || requestDate <= new Date(endDate));

      return matchesSearchTerm && matchesDateRange;
    });
  };

  // Render requests
  // Inside your renderRequests function in ReportPage
const renderRequests = (requestsToRender) => {
  return requestsToRender.map((request) => (
    <li key={request.id}>
      <p>
        <strong>Unique ID:</strong> {request.uniqueId} 
        <button onClick={() => navigator.clipboard.writeText(request.uniqueId)}>Copy</button>
      </p>
      <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
      <p><strong>Supplier Name:</strong> {request.supplierName}</p>
      <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
      <p><strong>Category:</strong> {request.category}</p>
      <p><strong>Specific Type:</strong> {request.specificType || 'N/A'}</p>
      <p><strong>Academic Program:</strong> {request.program || 'N/A'}</p>
      
     
      
      {/* Displaying items requested */}
      <div>
        <strong>Items Requested:</strong>
        <ul>
          {request.itemName && request.itemName.length > 0 ? (
            request.itemName.map((item, index) => {
              const itemRequested = parseInt(item.quantity || 0, 10);
              const itemPurchased = parseInt(item.purchasedQuantity || 0, 10);
              const finalNotPurchased = itemRequested - itemPurchased;

              return (
                <li key={index}>
                  {item.name} - 
                  <span> {itemRequested} requested,</span> 
                  <span> {itemPurchased} purchased,</span> 
                  <span> {finalNotPurchased} not purchased</span>
                </li>
              );
            })
          ) : (
            <li>No items requested.</li>
          )}
        </ul>
      </div>
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
          <input 
            type="text" 
            placeholder="Search by Unique ID, College, Department, or Non-Academic" 
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
          <ul>
            {filteredRequests().length > 0 ? (
              renderRequests(filteredRequests())
            ) : (
              <p>No requests found.</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

export default ReportPage;