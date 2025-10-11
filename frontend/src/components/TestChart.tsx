import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Simple test chart component
const TestChart: React.FC = () => {
  const data: Array<{ date: string; count: number }> = [];

  return (
    <div className="w-full h-[300px] border border-gray-300 p-4">
      <h3 className="text-sm font-medium mb-2">Test Chart</h3>
      <div className="text-xs text-gray-500 mb-2">
        Data: {JSON.stringify(data)}
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" name="Test Count" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TestChart;
