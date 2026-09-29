/**
 * Uploads reel video directly to server in-memory buffer which permanently stores on Catbox.moe CDN.
 * Provides real-time upload percentage (0% -> 90%) and processing indicator (92% -> 100%).
 */
export const uploadReelVideo = async (
  file: File,
  token: string,
  onProgress: (progress: number, text: string) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    onProgress(2, "Video yuklashga tayyorlanmoqda... 2%");

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('video', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Upload phase: 2% to 90%
        const percent = Math.max(2, Math.min(Math.round((event.loaded / event.total) * 90), 90));
        const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (event.total / (1024 * 1024)).toFixed(1);
        onProgress(percent, `Video yuklanmoqda... ${percent}% (${loadedMB}/${totalMB} MB)`);
      }
    };

    xhr.upload.onloadend = () => {
      onProgress(92, "Catbox serverida doimiy saqlanmoqda... 92%");
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.url) {
            onProgress(100, "Muvaffaqiyatli yakunlandi! 100%");
            resolve(data.url);
          } else {
            reject(new Error("Serverdan video havolasi olinmadi"));
          }
        } catch {
          reject(new Error("Server javobini o'qib bo'lmadi"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 413) {
            reject(new Error("Video hajmi ruxsat berilgan hajmdan katta (maksimal 30 MB)"));
          } else {
            reject(new Error(data.error || `Video yuklashda xatolik (${xhr.status})`));
          }
        } catch {
          reject(new Error(`Video yuklashda xatolik (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Tarmoqda xatolik yuz berdi. Internet aloqasini tekshiring."));
    };

    xhr.onabort = () => {
      reject(new Error("Video yuklash bekor qilindi"));
    };

    xhr.open('POST', '/api/reels/upload-direct', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
};
