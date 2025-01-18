import { Runtime, Environment } from "../../src/types/enums";

export class MockProcessor {
  constructor() {
    this.entries = [];
  }

  supports(runtime) {
    return true;
  }

  allowedIn(environment) {
    return true;
  }

  async process(entry) {
    this.entries.push(entry);
    return entry;
  }
}

export class MockTransport {
  constructor() {
    this.entries = [];
  }

  async write(entry) {
    this.entries.push(entry);
  }
}
