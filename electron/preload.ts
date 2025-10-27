import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('native', {
  isElectron: true
})
