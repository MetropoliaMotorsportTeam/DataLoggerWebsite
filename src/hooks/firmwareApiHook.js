
const firmwareApiUrl = import.meta.env.VITE_FIRMWARE_API;


  const uploadFirmware = async (firmware) => {
    if (!firmware) {

      return false;
    }

    const formData = new FormData();
    formData.append('firmware', firmware);

    try {
      const response = await fetch(`${firmwareApiUrl}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      return true;
      
    } catch (err) {
      return err;
    } 
    };

    export {uploadFirmware}
