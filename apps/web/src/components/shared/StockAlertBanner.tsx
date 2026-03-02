'use client';

import { useEffect, useState } from 'react';
import { wsClient, StockAlertPayload } from '@/lib/websocket';
import { authService } from '@/services/auth.service';
import { AlertTriangle, X } from 'lucide-react';

export function StockAlertBanner() {
    const [alert, setAlert] = useState<StockAlertPayload | null>(null);

    useEffect(() => {
        if (!authService.isAuthenticated()) return;

        wsClient.connect();

        const unsubLow = wsClient.on('stock.low', (payload) => setAlert(payload));
        const unsubCritical = wsClient.on('stock.critical', (payload) => setAlert(payload));

        return () => {
            unsubLow();
            unsubCritical();
        };
    }, []);

    if (!alert) return null;

    const isCritical = alert.currentQuantity <= 0;

    return (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full shadow-lg rounded-xl border p-4 flex items-start gap-3 animate-fade-in ${isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCritical ? 'text-red-800' : 'text-amber-800'}`}>
                    {isCritical ? 'Stok Habis!' : 'Stok Menipis'}
                </p>
                <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                    <strong>{alert.productName}</strong> ({alert.productSku}) — tersisa {alert.currentQuantity} unit (min: {alert.minStock})
                </p>
            </div>
            <button onClick={() => setAlert(null)} className={`${isCritical ? 'text-red-400 hover:text-red-600' : 'text-amber-400 hover:text-amber-600'} transition-colors flex-shrink-0`}>
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
