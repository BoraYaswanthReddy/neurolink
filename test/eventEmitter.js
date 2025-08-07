/**
 * NeuroLink EventEmitter Test - Complete Event Tracking
 *
 * Tests all EventEmitter functionality and tracks event occurrences
 * Run with: node test/eventEmitter.js
 */

import { neurolink } from "../dist/lib/neurolink.js";
import { config } from "dotenv";

config();

console.log("🚀 EventEmitter Test - Listening to Events\n");

// Event tracking
const eventStatus = {
  "generation:start": false,
  "generation:end": false,
  "stream:start": false,
  "stream:end": false,
  "tool:start": false,
  "tool:end": false,
  "tool:register:start": false,
  "tool:register:end": false,
};

const eventData = {};

// Get EventEmitter
const emitter = neurolink.getEventEmitter();

// Set up listeners for ALL events (silent tracking)
console.log("📡 Setting up event listeners for all events...");

emitter.on("generation:start", (data) => {
  eventStatus["generation:start"] = true;
  eventData["generation:start"] = data;
});

emitter.on("generation:end", (data) => {
  eventStatus["generation:end"] = true;
  eventData["generation:end"] = data;
});

emitter.on("stream:start", (data) => {
  eventStatus["stream:start"] = true;
  eventData["stream:start"] = data;
});

emitter.on("stream:end", (data) => {
  eventStatus["stream:end"] = true;
  eventData["stream:end"] = data;
});

emitter.on("tool:register:start", (data) => {
  eventStatus["tool:register:start"] = true;
  eventData["tool:register:start"] = data;
});

emitter.on("tool:register:end", (data) => {
  eventStatus["tool:register:end"] = true;
  eventData["tool:register:end"] = data;
});

emitter.on("tool:start", (data) => {
  eventStatus["tool:start"] = true;
  eventData["tool:start"] = data;
});

emitter.on("tool:end", (data) => {
  eventStatus["tool:end"] = true;
  eventData["tool:end"] = data;
});

console.log("✅ All event listeners set up!\n");

async function runTests() {
  try {
    console.log("🎬 Starting EventEmitter tests...\n");

    // Test 1: Generation Events
    process.stdout.write("📝 TEST 1: Generation Events - ");
    try {
      await neurolink.generate({
        input: { text: "Hello test" },
        provider: "vertex",
      });
      console.log("✅ SUCCESS");
    } catch (error) {
      console.log("❌ FAILED");
    }

    // Test 2: Tool Registration
    process.stdout.write("📝 TEST 2: Tool Registration Events - ");
    try {
      neurolink.registerTool("testEventTool", {
        description: "Tool for testing events",
        execute: async (args) => `Test executed: ${JSON.stringify(args)}`,
      });
      console.log("✅ SUCCESS");
    } catch (error) {
      console.log("❌ FAILED");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Test 3: Tool Execution
    process.stdout.write("📝 TEST 3: Tool Execution Events - ");
    try {
      await neurolink.executeTool("testEventTool", { test: "data" });
      console.log("✅ SUCCESS");
    } catch (error) {
      console.log("❌ FAILED");
    }

    // Test 4: Stream Events
    process.stdout.write("📝 TEST 4: Stream Events - ");
    try {
      const streamResult = await neurolink.stream({
        input: { text: "Count to 3" },
        provider: "vertex",
      });

      let chunkCount = 0;
      for await (const chunk of streamResult.stream) {
        chunkCount++;
        if (chunkCount > 10) {
          break; // Limit chunks
        }
      }
      console.log("✅ SUCCESS");
    } catch (error) {
      console.log("❌ FAILED");
    }

    console.log("\n🎯 All tests completed!\n");
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
  }
}

function printSummary() {
  console.log("═".repeat(80));
  console.log("📊EventEmitter Test Summary");
  console.log("═".repeat(80));

  console.log("\n🎯 EVENT STATUS:");
  const eventGroups = {
    "Generation Events": ["generation:start", "generation:end"],
    "Stream Events": ["stream:start", "stream:end"],
    "Tool Registration Events": ["tool:register:start", "tool:register:end"],
    "Tool Execution Events": ["tool:start", "tool:end"],
  };

  let totalEvents = 0;
  let capturedEvents = 0;

  Object.entries(eventGroups).forEach(([groupName, events]) => {
    console.log(`\n${groupName}:`);
    events.forEach((eventName) => {
      totalEvents++;
      const status = eventStatus[eventName];
      const icon = status ? "✅" : "❌";
      console.log(
        `  ${icon} ${eventName}: ${status ? "CAPTURED" : "NOT CAPTURED"}`,
      );
      if (status) {
        capturedEvents++;
      }
    });
  });

  console.log("\n─".repeat(80));
  console.log(`📈 SUMMARY: ${capturedEvents}/${totalEvents} events captured`);
  console.log(
    `📊 Success Rate: ${Math.round((capturedEvents / totalEvents) * 100)}%`,
  );

  if (capturedEvents === totalEvents) {
    console.log("🎉 SUCCESS: All events were captured!");
  } else {
    console.log(
      "⚠️  Some events were missing - check EventEmitter implementation",
    );
  }

  console.log("\n🔍 CAPTURED EVENT DATA:");
  Object.entries(eventData).forEach(([eventName, data]) => {
    if (data !== undefined && data !== null) {
      console.log(`  ${eventName}: ${JSON.stringify(data).slice(0, 100)}...`);
    } else {
      console.log(`  ${eventName}: No data captured`);
    }
  });

  console.log("\n✅EventEmitter Test Completed");
  console.log("═".repeat(80));
}

// Check environment
if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !process.env.GOOGLE_SERVICE_ACCOUNT_KEY
) {
  console.error("❌ Missing Google Vertex AI credentials");
  console.error(
    "Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY in .env file",
  );
  process.exit(1);
}

// Run tests and print summary
runTests()
  .then(() => {
    // Small delay to ensure all events are processed
    setTimeout(() => {
      printSummary();
    }, 1000);
  })
  .catch(console.error);
