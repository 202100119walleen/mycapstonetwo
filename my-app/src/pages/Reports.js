import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config'; 

const Reports = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(fetchedRequests);
    });
    return () => unsubscribe();
  }, []);

  const categorizeRequests = () => {
    const categorized = {
      requested: [],
      purchased: [],
      notPurchased: [],
    };

    requests.forEach(request => {
      request.itemName.forEach(item => {
        const itemRequested = parseInt(item.quantity || 0, 10);
        const itemPurchased = parseInt(item.purchasedQuantity || 0, 10);
        const finalNotPurchased = itemRequested - itemPurchased;

        if (itemRequested > 0) {
          categorized.requested.push({ ...request, item });
        }
        if (itemPurchased > 0) {
          categorized.purchased.push({ ...request, item });
        }
        if (finalNotPurchased > 0) {
          categorized.notPurchased.push({ ...request, item });
        }
      });
    });

    return categorized;
  };

  const categorizedRequests = categorizeRequests();

  return (
    <div className="reports">
      <h1>Reports</h1>

      <h2>Requested Items</h2>
      {categorizedRequests.requested.length > 0 ? (
        <ul>
          {categorizedRequests.requested.map((request, index) => (
            <li key={index}>
              <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
              <p><strong>Supplier Name:</strong> {request.supplierName}</p>
              <p><strong>It                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     em Name:</strong> {request.item.name}</p>
              <p><strong>Quantity Requested:</strong> {request.item.quantity}</p>
              <p><strong>Unique ID:</strong> {request.uniqueId}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requested items found.</p>
      )}

      <h2>Purchased Items</h2>
      {categorizedRequests.purchased.length > 0 ? (
        <ul>
          {categorizedRequests.purchased.map((request, index) => (
            <li key={index}>
              <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
              <p><strong>Supplier Name:</strong> {request.supplierName}</p>
              <p><strong>Item Name:</strong> {request.item.name}</p>
              <p><strong>Quantity Purchased:</strong> {request.item.purchasedQuantity}</p>
              <p><strong>Unique ID:</strong> {request.uniqueId}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No purchased items found.</p>
      )}

      <h2>Not Purchased Items</h2>
      {categorizedRequests.notPurchased.length > 0 ? (
        <ul>
          {categorizedRequests.notPurchased.map((request, index) => (
            <li key={index}>
              <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
              <p><strong>Supplier Name:</strong> {request.supplierName}</p>
              <p><strong>Item Name:</strong> {request.item.name}</p>
              <p><strong>Quantity Not Purchased:</strong> {request.item.quantity - request.item.purchasedQuantity}</p>
              <p><strong>Unique ID:</strong> {request.uniqueId}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No items not purchased found.</p>
      )}
    </div>
  );
};

export default Reports; 