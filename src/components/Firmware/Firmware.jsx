import React, { useState } from 'react';
import { uploadFirmware } from '../../hooks/firmWareApiHook';


function Firmware() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  
  // MOCK DATA, FIRMWARE VERSIONS
  const firmwareVersions = [
    { version: 'v2.3.1', date: '2025-04-15', status: 'current', notes: 'Improved power management, fixed sensor calibration bug' },
    { version: 'v2.2.0', date: '2025-03-02', status: 'stable', notes: 'Added support for new temperature sensors' },
    { version: 'v2.1.5', date: '2025-02-10', status: 'legacy', notes: 'Emergency fix for logging issue during high RPM' },
    { version: 'v2.1.0', date: '2025-01-20', status: 'legacy', notes: 'Enhanced data sampling rate, UI improvements' },
  ];
  
  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadStatus(null);
    setUploadProgress(0);
    console.log("SELECTED FILE: ", file)
  };



  // Simulate upload to AWS backend

  const handleUpload = async ()  => {
    if (!selectedFile) 
    return;
    const response = await uploadFirmware(selectedFile);

    console.log("wtf is this response: ", response);


    if(response) {
       setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 300);

    // Simulate upload completion after 3 seconds
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setUploading(false);
      setUploadStatus('success');
      // In a real app, you would make an API call to your AWS backend here
    }, 3000);
  };2
  }








  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Firmware Management</h1>
        <p className="text-gray-600">
          Upload and manage firmware for your data logger and ECU systems.
          Firmware updates are synced to your devices via secure AWS connection.
        </p>
      </div>
      
      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Upload Firmware</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Selector - first two columns */}
          <div className="md:col-span-2">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center relative ${
              selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}>
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-blue-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button 
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag binary file here or click to select
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported formats: .bin
                  </p>
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".bin,.hex,.fw"
              />
            </div>

            {uploadStatus === 'uploading' && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Firmware uploaded successfully! Ready to deploy.
              </div>
            )}
          </div>
          
          {/* Form inputs - third column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firmware Version
              </label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="e.g. v2.4.0"
              />
              
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="e.g. stable, current, legacy "
              />
              
            </div>

            

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Release Notes
              </label>
              <textarea 
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                rows="3"
                placeholder="Describe changes in this firmware version"
              ></textarea>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                !selectedFile || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Firmware'}
            </button>
          </div>
        </div>
      </div>
      

      
      {/* Firmware History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Firmware Version History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Release Date
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Release Notes
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {firmwareVersions.map((firmware, index) => (
                <tr key={index} className={firmware.status === 'current' ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {firmware.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {firmware.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      firmware.status === 'current'
                        ? 'bg-blue-100 text-blue-800'
                        : firmware.status === 'stable'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {firmware.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {firmware.notes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">Download</button>
                    <button className="text-gray-600 hover:text-gray-900">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

}

export default Firmware;