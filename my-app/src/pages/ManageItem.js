import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config'; // Adjust the import based on your project structure
import './ManageItem.css'; // Optional: Add your styles

const ManageItems = () => {
  const [approvedRequests, setApprovedRequests] = useState([]);

  useEffect(() => {
    const approvedRequestsCollection = collection(db, 'approvedRequests');
    const unsubscribe = onSnapshot(approvedRequestsCollection, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setApprovedRequests(fetchedRequests);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="manage-items">
      <h1>Purchased Items</h1>
      {approvedRequests.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Request Date</th>
              <th>Purchase Date</th>
              <th>Supplier Name</th>
              <th>Category</th>
              <th>Main Category</th>
              <th>Subcategory</th>
              <th>Specific Type</th>
              <th>Academic Program</th>
              <th>Items Purchased</th>
            </tr>
          </thead>
          <tbody>
            {approvedRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.uniqueId}</td>
                <td>{new Date(request.requestDate).toLocaleDateString()}</td>
                <td>{new Date(request.purchaseDate).toLocaleDateString()}</td>
                <td>{request.supplierName}</td>
                <td>{request.category}</td>
                <td>{request.mainCategory}</td>
                <td>{request.subcategory}</td>
                <td>{request.specificType}</td>
                <td>{request.academicProgram}</td>
                <td>
                  <ul>
                    {request.items.map((item, index) => (
                      <li key={index}>
                        {item.name} - Quantity: {item.quantity}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No purchased items found.</p>
      )}
    </div>
  );
};

export default ManageItems;