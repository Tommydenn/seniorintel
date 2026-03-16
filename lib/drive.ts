const FOLDER_NAME = "SeniorIntel"

async function driveReq(path: string, token: string, method = "GET", body?: object) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Drive ${res.status}`)
  return data
}

export async function getOrCreateFolder(token: string): Promise<string> {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const res = await driveReq(`files?q=${q}&fields=files(id)&spaces=drive`, token)
  if (res.files?.length) return res.files[0].id
  const folder = await driveReq("files", token, "POST", {
    name: FOLDER_NAME,
    mimeType: "application/vnd.google-apps.folder",
  })
  return folder.id
}

export async function readFile(token: string, folderId: string, filename: string) {
  const q = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`)
  const res = await driveReq(`files?q=${q}&fields=files(id)&spaces=drive`, token)
  if (!res.files?.length) return null
  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${res.files[0].id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return fileRes.ok ? fileRes.json() : null
}

export async function writeFile(token: string, folderId: string, filename: string, data: object) {
  // Check if file exists
  const q = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`)
  const existing = await driveReq(`files?q=${q}&fields=files(id)&spaces=drive`, token)
  const fileId = existing.files?.[0]?.id

  const content = JSON.stringify({ ...data, _lastUpdated: new Date().toISOString() }, null, 2)
  const meta = fileId
    ? { name: filename }
    : { name: filename, mimeType: "application/json", parents: [folderId] }

  const boundary = "si_" + Date.now()
  const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

  const res = await fetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary="${boundary}"`,
    },
    body,
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error?.message || `Upload ${res.status}`)
  return result
}
