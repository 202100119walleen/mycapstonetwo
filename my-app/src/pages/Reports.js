import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import './Reports.css';

const ReportPage = () => {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const requestCollection = collection(db, 'requests');
        const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
            const fetchedRequests = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setReports(fetchedRequests);
        });
        return () => unsubscribe();
    }, []);

    // Categorizing and sorting by request date
    const categorizedReports = () => {
        const categorized = {
            requested: [],
            purchased: [],
            notPurchased: [],
        };

        reports.forEach((request) => {
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

        // Sort each category by request date
        Object.keys(categorized).forEach(key => {
            categorized[key].sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
        });

        return categorized;
    };

    const categorizedRequests = categorizedReports();

    return (
        <div className="report-page">
            <h1>Reports</h1>

            <h2>Requested Items</h2>
            {categorizedRequests.requested.length > 0 ? (
                <ul>
                    {categorizedRequests.requested.map((request, index) => (
                        <li key={index}>
                            <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                            <strong>Requested Items:</strong>
                            <ul>
                                <li>{request.item.name} - Requested: {request.item.quantity}</li>
                            </ul>
                            <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                            <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                            <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
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
                            <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                            <strong>Purchased Items:</strong>
                            <ul>
                                <li>{request.item.name} - Purchased: {request.item.purchasedQuantity}</li>
                            </ul>
                            <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                            <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                            <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
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
                            <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                            <strong>Not Purchased Items:</strong>
                            <ul>
                                <li>{request.item.name} - Not Purchased: {request.item.quantity - request.item.purchasedQuantity}</li>
                            </ul>
                            <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                            <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                            <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No items not purchased found.</p>
            )}
        </div>
    );
};

export default ReportPage;