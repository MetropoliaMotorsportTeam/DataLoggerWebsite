import { getApiBase, getAuthHeaders } from '../utils/api';

const firmwareApiUrl = `${getApiBase()}/firmware`;

const uploadFirmware = async (firmware, deviceId, configFile = null) => {
  if (!firmware) {
    return false;
  }
  
  if (!deviceId) {
    throw new Error('Device ID is required for CanEdge3 logger');
  }

  const formData = new FormData();
  formData.append('firmware', firmware);
  formData.append('deviceId', deviceId);
  formData.append('target', 'canedge3');  // Specifying target as CanEdge3
  
  // Add config file if available
  if (configFile) {
    formData.append('config', configFile);
    console.log('Including config file in upload:', configFile.name);
  }

  try {
    const response = await fetch(`${firmwareApiUrl}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...getAuthHeaders(),
        'X-Device-Type': 'canedge3'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }
    
    return {
      success: true,
      message: configFile 
        ? 'Firmware and configuration successfully uploaded to CanEdge3 AWS bucket' 
        : 'Firmware successfully uploaded to CanEdge3 AWS bucket',
      deviceId,
      hasConfig: Boolean(configFile)
    };
    
  } catch (err) {
    console.error('Firmware upload error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error occurred during firmware upload',
      deviceId,
      hasConfig: Boolean(configFile)
    };
  } 
};

const checkFirmwareStatus = async (deviceId) => {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }
  
  try {
    const response = await fetch(`${firmwareApiUrl}/status/${deviceId}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'X-Device-Type': 'canedge3'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get status with code ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Status check error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error occurred checking firmware status',
      deviceId
    };
  }
};

export { uploadFirmware, checkFirmwareStatus };
