export const storage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
  sync: {
    get: jest.fn(),
    set: jest.fn(),
  },
};

export const runtime = {
  sendMessage: jest.fn().mockResolvedValue(undefined),
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  getURL: jest.fn(),
};

export const tabs = {
  query: jest.fn(),
  sendMessage: jest.fn(),
  create: jest.fn(),
  captureVisibleTab: jest.fn(),
};

export const contextMenus = {
  create: jest.fn(),
  onClicked: {
    addListener: jest.fn(),
  },
};

export const bookmarks = {
  getTree: jest.fn(),
  create: jest.fn(),
};

const browser = {
  storage,
  runtime,
  tabs,
  contextMenus,
  bookmarks,
};

export default browser;
