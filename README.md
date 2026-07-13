<div align="center">

# Path2Plate-AI

### Intelligent Indoor Food Delivery

*A Bluetooth-assisted robotics platform inspired by heuristic path planning and secure delivery verification.*

<br>

<img src="assets/hero.png" width="100%"/>

<br>

<p>

<img src="https://img.shields.io/badge/Arduino-UNO-00979D?style=flat-square&logo=arduino">

<img src="https://img.shields.io/badge/C++-Embedded-blue?style=flat-square&logo=cplusplus">

<img src="https://img.shields.io/badge/Bluetooth-HC--05-0082FC?style=flat-square">

<img src="https://img.shields.io/badge/A*-Inspired_Routing-76B900?style=flat-square">

<img src="https://img.shields.io/badge/QR-Verification-success?style=flat-square">

<img src="https://img.shields.io/badge/License-MIT-black?style=flat-square">

</p>

</div>

---

# Intelligence Beyond Navigation

> **Path2Plate demonstrates that intelligent routing is achieved through efficient algorithms—not expensive hardware.**

Modern indoor delivery systems often rely on sophisticated sensors, autonomous navigation, and high-performance computing platforms.

Path2Plate explores a different engineering philosophy.

Instead of replacing human decision-making, it combines heuristic path planning with Bluetooth-assisted control, allowing intelligent software to enhance simple embedded hardware.

The result is an educational robotics platform that demonstrates how search algorithms, embedded systems, and delivery authentication can work together within a compact and affordable mobile robot.

---

# The Challenge

Indoor robotic delivery appears simple on the surface, but efficient navigation introduces several engineering challenges.

<table>

<tr>
<th width="30%">Challenge</th>
<th>Description</th>
</tr>

<tr>
<td><strong>Route Planning</strong></td>
<td>Finding an efficient path while minimizing unnecessary movement.</td>
</tr>

<tr>
<td><strong>Hardware Cost</strong></td>
<td>Most autonomous robots depend on LiDAR, SLAM, or depth cameras.</td>
</tr>

<tr>
<td><strong>Embedded Constraints</strong></td>
<td>Microcontrollers provide limited processing resources compared to onboard computers.</td>
</tr>

<tr>
<td><strong>Delivery Reliability</strong></td>
<td>Ensuring food reaches the intended customer without errors.</td>
</tr>

<tr>
<td><strong>Educational Accessibility</strong></td>
<td>Keeping the platform understandable for robotics and embedded systems learners.</td>
</tr>

</table>

Path2Plate addresses these challenges through algorithmic optimization rather than hardware complexity.

---

<div align="center">

<img src="assets/architecture.svg" width="100%"/>

</div>

---

# Design Philosophy

Rather than maximizing autonomy, Path2Plate focuses on maximizing understanding.

The project is built around four engineering principles.

| Principle | Description |
|------------|-------------|
| **Algorithm First** | Intelligent software should improve robot behaviour before adding hardware complexity. |
| **Embedded Simplicity** | Every electronic component serves a clear and measurable purpose. |
| **Human-Assisted Navigation** | Operators execute movement while algorithms optimize decision-making. |
| **Secure Delivery** | Every delivery must be authenticated before completion. |

---

# Key Capabilities

<table>

<tr>

<td width="33%" valign="top">

## Routing Intelligence

Computes an efficient delivery route inspired by the A* Search Algorithm.

**Highlights**

- Heuristic path evaluation
- Optimized traversal
- Lightweight computation
- Educational implementation

</td>

<td width="33%" valign="top">

## Bluetooth Control

Maintains responsive wireless communication between the mobile application and the robot.

**Highlights**

- HC-05 communication
- Low-latency commands
- Manual navigation
- Reliable operation

</td>

<td width="33%" valign="top">

## QR Verification

Authenticates every delivery before completion.

**Highlights**

- Customer validation
- Delivery confirmation
- Lightweight authentication
- Secure workflow

</td>

</tr>

</table>

<br>

<table>

<tr>

<td width="33%" valign="top">

## Embedded Control

Coordinates every subsystem using Arduino UNO.

**Includes**

- Motor control
- Bluetooth interface
- OLED updates
- Navigation logic

</td>

<td width="33%" valign="top">

## OLED Interface

Displays robot information during operation.

**Displays**

- Robot state
- Navigation status
- Bluetooth connection
- Delivery progress

</td>

<td width="33%" valign="top">

## Compact Platform

Designed around affordable and widely available components.

**Advantages**

- Easy assembly
- Low power consumption
- Minimal hardware
- Educational design

</td>

</tr>

</table>

---

# Why Path2Plate?

Many educational robots demonstrate movement.

Path2Plate demonstrates **decision making**.

Instead of focusing exclusively on locomotion, the project introduces concepts that appear throughout modern robotics research.

### Search Algorithms

- Graph traversal
- Heuristic optimisation
- Route planning

### Embedded Systems

- Resource-constrained computing
- Real-time control
- Peripheral integration

### Mobile Robotics

- Differential drive
- Wireless navigation
- Human-assisted control

### Delivery Systems

- Authentication
- Verification
- Reliable operation

---

<div align="center">

<img src="assets/workflow.svg" width="100%"/>

</div>

---

# What Makes It Different?

Unlike conventional Bluetooth robots, Path2Plate combines multiple engineering disciplines within a single platform.

| Traditional Bluetooth Robot | Path2Plate |
|-----------------------------|------------|
| Manual movement only | Intelligent route planning |
| Basic motor control | Embedded routing logic |
| No authentication | QR-based delivery verification |
| Demonstrates robotics | Demonstrates robotics + algorithms |
| Standalone controller | Integrated delivery workflow |

---

<div align="center">

### Intelligent Algorithms

### Practical Engineering

### Reliable Delivery

</div>

---

---

# System Architecture

Path2Plate is organized as a collection of independent subsystems, each responsible for a specific aspect of the delivery process. Rather than concentrating all functionality into a single control loop, the project separates navigation, communication, embedded control, and delivery verification into modular components.

This layered design improves readability, simplifies debugging, and provides a clear relationship between software decisions and hardware execution.

<div align="center">

<img src="assets/architecture.svg" width="100%"/>

</div>

## Architecture Overview

| Layer | Responsibility |
|--------|----------------|
| **Application Layer** | Creates delivery requests, selects destinations, and initiates robot movement. |
| **Routing Layer** | Computes an efficient delivery path using an A*-inspired search strategy. |
| **Communication Layer** | Transfers movement commands between the mobile application and the robot through Bluetooth. |
| **Embedded Layer** | Coordinates navigation logic, OLED updates, QR verification, and motor control. |
| **Hardware Layer** | Executes physical movement through the differential-drive platform. |

---

# How It Works

Every delivery follows the same deterministic process, ensuring predictable robot behavior and secure order completion.

<div align="center">

<img src="assets/workflow.svg" width="100%"/>

</div>

## Delivery Lifecycle

### Route Preparation

Before navigation begins, the delivery destination is selected from a predefined environment.

The routing engine then evaluates the available paths and determines an efficient traversal strategy.

**Responsibilities**

- Destination selection
- Environment representation
- Route computation
- Navigation initialization

---

### Navigation

Instead of autonomous movement, the robot is controlled wirelessly using Bluetooth while following the computed route.

This combines algorithmic optimization with human adaptability.

**Responsibilities**

- Wireless communication
- Motion execution
- Manual obstacle avoidance
- Navigation guidance

---

### Delivery Authentication

Once the robot reaches its destination, delivery is authenticated through QR verification.

This prevents incorrect deliveries and introduces a practical security mechanism into the workflow.

**Responsibilities**

- QR validation
- Customer authentication
- Delivery confirmation
- Session completion

---

# Core Technologies

Path2Plate combines embedded electronics, mobile robotics, wireless communication, and search algorithms into a single educational platform.

<table>

<tr>

<th width="25%">Embedded</th>

<th width="25%">Communication</th>

<th width="25%">Navigation</th>

<th width="25%">Verification</th>

</tr>

<tr>

<td valign="top">

### Arduino UNO

Central controller responsible for

- Navigation logic
- Peripheral management
- Motor control
- Display updates

</td>

<td valign="top">

### HC-05

Wireless interface providing

- Bluetooth communication
- Command transmission
- Low-latency control
- Mobile connectivity

</td>

<td valign="top">

### A* Inspired Engine

Responsible for

- Route planning
- Cost estimation
- Node evaluation
- Efficient traversal

</td>

<td valign="top">

### QR Authentication

Provides

- Customer validation
- Secure delivery
- Order verification
- Completion confirmation

</td>

</tr>

</table>

---

# Routing Intelligence

Efficient delivery depends on making intelligent routing decisions before the robot begins moving.

Instead of continuously recalculating the path, Path2Plate evaluates the delivery environment in advance and determines an efficient traversal strategy inspired by the A* Search Algorithm.

This allows the operator to concentrate on movement while the routing engine provides navigation guidance.

## Routing Objectives

- Minimize travel distance
- Reduce unnecessary movement
- Maintain predictable navigation
- Improve delivery efficiency
- Demonstrate heuristic search

## Design Characteristics

| Property | Description |
|-----------|-------------|
| **Deterministic** | Produces repeatable routing decisions for identical environments. |
| **Lightweight** | Suitable for embedded hardware with limited computational resources. |
| **Understandable** | Easy to visualize and explain in educational settings. |
| **Modular** | Independent from Bluetooth communication and motor control. |

---

# Bluetooth Communication

Reliable communication is essential for responsive robot control.

Path2Plate uses the HC-05 Bluetooth module to establish a stable wireless connection between the Android application and the Arduino controller.

The communication protocol intentionally remains lightweight, reducing latency while keeping implementation straightforward.

## Communication Features

- Real-time command transmission
- Low-latency response
- Simple command protocol
- Reliable serial communication
- Easy mobile integration

## Command Set

| Command | Operation |
|----------|-----------|
| **F** | Move Forward |
| **B** | Move Backward |
| **L** | Turn Left |
| **R** | Turn Right |
| **S** | Stop Robot |

---

# QR Verification

Navigation alone is not sufficient for reliable delivery.

Authentication ensures that every order reaches the intended recipient before the delivery process is completed.

<div align="center">

<img src="assets/qr-verification.svg" width="100%"/>

</div>

## Verification Process

Each order is associated with a unique QR identifier.

Upon arrival,

the customer presents the assigned QR code.

The verification subsystem validates the authentication token before confirming delivery.

## Benefits

- Prevents incorrect deliveries
- Provides customer authentication
- Simple implementation
- Minimal computational overhead
- Suitable for embedded systems

---

<div align="center">

### Efficient Routing

### Reliable Communication

### Secure Authentication

</div>

---

---

# Hardware Platform

Path2Plate is built around a lightweight embedded architecture that prioritizes reliability, affordability, and educational accessibility. Every component has been selected to perform a specific role within the delivery workflow while keeping the overall system easy to understand and reproduce.

<div align="center">

<img src="assets/robot.png" width="90%"/>

</div>

---

# Platform Overview

The robot integrates navigation, communication, embedded processing, and delivery verification into a compact four-wheel differential drive platform.

| Category | Description |
|-----------|-------------|
| **Controller** | Arduino UNO |
| **Communication** | HC-05 Bluetooth |
| **Motor Driver** | L298N Dual H-Bridge |
| **Display** | SSD1306 OLED Display |
| **Power** | Rechargeable Battery Pack |
| **Drive System** | Four-Wheel Differential Drive |

---

# Design Goals

The hardware architecture was designed with several engineering objectives.

### Lightweight

- Compact embedded electronics
- Minimal wiring complexity
- Low power consumption
- Portable platform

---

### Reliable

- Stable Bluetooth communication
- Dedicated motor driver
- Independent subsystem control
- Robust electrical connections

---

### Educational

- Easily understandable architecture
- Standard Arduino ecosystem
- Widely available components
- Beginner-friendly assembly

---

### Modular

- Independent electronics
- Replaceable hardware
- Expandable software
- Simplified maintenance

---

# Electronics Overview

The electronics architecture separates sensing, processing, communication, display, and actuation into dedicated modules.

This modular organization improves reliability while simplifying debugging and future maintenance.

| Module | Responsibility |
|----------|----------------|
| **Arduino UNO** | Central embedded controller |
| **HC-05** | Bluetooth communication |
| **L298N** | Motor control |
| **OLED Display** | Robot status interface |
| **Battery** | Portable power source |

---

# Arduino UNO

The Arduino UNO serves as the computational core of Path2Plate.

It coordinates every subsystem within the robot while executing routing logic and handling communication.

### Responsibilities

- Execute navigation logic
- Receive Bluetooth commands
- Update OLED display
- Control motor driver
- Manage delivery workflow

### Why Arduino UNO?

- Large ecosystem
- Reliable hardware
- Easy programming
- Extensive documentation
- Ideal for embedded education

---

# HC-05 Bluetooth Module

Wireless communication is established using the HC-05 Bluetooth module.

Instead of autonomous navigation, the operator communicates directly with the robot through a mobile application.

### Features

- Serial communication
- Stable wireless connection
- Low latency
- Android compatibility
- Simple integration

---

# L298N Motor Driver

The L298N dual H-bridge driver provides independent control over the left and right motor pairs.

It enables forward motion, reverse motion, and differential steering while protecting the Arduino from high motor currents.

### Capabilities

- Dual DC motor control
- PWM speed control
- Bidirectional movement
- High current handling

---

# OLED Display

The SSD1306 OLED provides immediate visual feedback during robot operation.

Instead of relying entirely on the mobile application, important information is displayed directly on the robot.

### Information Displayed

- Bluetooth connection
- Navigation status
- Delivery status
- QR verification
- System state

---

# Drive Platform

The mechanical platform uses a four-wheel differential drive configuration.

This configuration provides stable movement while remaining mechanically simple.

### Advantages

- Smooth indoor navigation
- Compact footprint
- Simple steering
- Stable movement
- Low maintenance

---

# Hardware Specifications

| Component | Specification |
|------------|---------------|
| Controller | Arduino UNO R3 |
| Communication | HC-05 Bluetooth |
| Motor Driver | L298N |
| Motors | 4 × DC Geared Motors |
| Display | 0.96" SSD1306 OLED |
| Voltage | 7–12V DC |
| Drive Type | Differential Drive |

---

# Power Architecture

The robot is powered using a rechargeable battery pack shared across the embedded controller and motor driver.

Power distribution has been designed to maintain stable operation during navigation.

### Characteristics

- Portable power source
- Shared ground reference
- Independent motor supply
- Efficient power utilization

---

# Embedded Software

The software running on the Arduino follows a modular architecture.

Instead of implementing every feature inside a single loop, the application separates responsibilities into logical modules.

### Software Modules

| Module | Responsibility |
|----------|----------------|
| Navigation | Route computation |
| Bluetooth | Command handling |
| Motion | Motor control |
| Display | OLED updates |
| Verification | QR validation |

---

# Engineering Decisions

Every major design choice in Path2Plate was made to balance simplicity with functionality.

| Decision | Engineering Benefit |
|-----------|---------------------|
| Bluetooth Control | Eliminates complex autonomous hardware |
| Arduino UNO | Low-cost embedded processing |
| QR Verification | Reliable delivery authentication |
| OLED Display | Local system feedback |
| Differential Drive | Simple and stable navigation |

---

# Why This Hardware?

The objective of Path2Plate is not to maximize hardware capability.

Instead, the platform demonstrates how intelligent software can significantly improve the effectiveness of simple embedded electronics.

This philosophy allows learners to focus on

- Embedded programming
- Search algorithms
- Wireless communication
- Robotics integration
- Engineering system design

without requiring expensive sensors or high-performance computing platforms.

---

<div align="center">

### Simple Hardware

### Intelligent Software

### Reliable Delivery

</div>

---

---

# Technical Specifications

Path2Plate combines embedded electronics, heuristic routing, and wireless communication into a compact robotics platform optimized for indoor delivery demonstrations.

<table>

<tr>
<th width="28%">Category</th>
<th>Specification</th>
</tr>

<tr>
<td><strong>Platform</strong></td>
<td>Arduino-based Mobile Robotics</td>
</tr>

<tr>
<td><strong>Navigation</strong></td>
<td>A*-Inspired Heuristic Routing</td>
</tr>

<tr>
<td><strong>Control</strong></td>
<td>Bluetooth Assisted Navigation</td>
</tr>

<tr>
<td><strong>Communication</strong></td>
<td>HC-05 Bluetooth Module</td>
</tr>

<tr>
<td><strong>Embedded Controller</strong></td>
<td>Arduino UNO R3</td>
</tr>

<tr>
<td><strong>Motor Driver</strong></td>
<td>L298N Dual H-Bridge</td>
</tr>

<tr>
<td><strong>Display</strong></td>
<td>SSD1306 OLED</td>
</tr>

<tr>
<td><strong>Verification</strong></td>
<td>QR Code Authentication</td>
</tr>

<tr>
<td><strong>Programming Language</strong></td>
<td>Embedded C++</td>
</tr>

<tr>
<td><strong>Application Domain</strong></td>
<td>Indoor Food Delivery</td>
</tr>

</table>

---

# Performance Characteristics

The project emphasizes engineering efficiency rather than computational complexity.

<div align="center">

| Characteristic | Focus |
|:--------------|:------|
| Navigation | Efficient Route Selection |
| Communication | Low-Latency Bluetooth |
| Processing | Lightweight Embedded Logic |
| Verification | Secure QR Authentication |
| User Experience | Simple Mobile Control |
| Learning Value | Robotics + Algorithms |

</div>

---

# Project Highlights

<table>

<tr>

<td width="33%" valign="top">

## Navigation

• A*-Inspired Routing

• Heuristic Decision Making

• Efficient Path Selection

• Indoor Delivery Workflow

</td>

<td width="33%" valign="top">

## Embedded Systems

• Arduino UNO

• OLED Interface

• Bluetooth Communication

• Differential Drive

</td>

<td width="33%" valign="top">

## Authentication

• QR Verification

• Customer Validation

• Reliable Delivery

• Secure Completion

</td>

</tr>

</table>

---

# Learning Outcomes

Path2Plate demonstrates the interaction between multiple engineering disciplines within a single robotics platform.

### Robotics

- Mobile Robot Design
- Differential Drive Systems
- Motion Control
- Robot Navigation

### Embedded Systems

- Microcontroller Programming
- Peripheral Integration
- Serial Communication
- Real-Time Control

### Algorithms

- Graph Search
- Heuristic Evaluation
- Route Optimization
- Decision Making

### Software Engineering

- Modular Architecture
- Component Isolation
- Embedded Design
- System Integration

---

# Applications

Although designed as an educational robotics platform, the engineering concepts demonstrated by Path2Plate are directly applicable to several real-world domains.

| Domain | Relevance |
|---------|-----------|
| Smart Cafeterias | Indoor food delivery |
| Hospitals | Medicine transportation |
| Libraries | Book transportation |
| Warehouses | Small payload logistics |
| Educational Robotics | Algorithm visualization |
| Embedded Systems | Real-time control |

---

# Repository Assets

<div align="center">

| Asset | Purpose |
|:------|:--------|
| `hero.png` | Repository Hero Banner |
| `logo.svg` | Brand Identity |
| `architecture.svg` | System Architecture |
| `workflow.svg` | Delivery Workflow |
| `qr-verification.svg` | Authentication Overview |
| `robot.png` | Physical Robot Platform |

</div>

---

# Documentation Principles

This repository follows several design principles intended to improve readability and maintainability.

- Visual-first documentation
- Modular engineering concepts
- Clear subsystem separation
- Minimal but meaningful explanations
- Consistent terminology
- Engineering-oriented presentation

---

# Contributing

Contributions that improve the educational value, documentation quality, hardware design, or software architecture of Path2Plate are welcome.

Please ensure that proposed changes remain aligned with the project's design philosophy of simplicity, modularity, and intelligent embedded systems.

---

# License

This project is released under the **MIT License**.

You are free to use, modify, distribute, and build upon this work in accordance with the terms of the license.

---

<div align="center">



# Path2Plate

### Intelligent Indoor Food Delivery

*A Bluetooth-assisted robotics platform inspired by heuristic path planning.*

<br>

Built with

**Arduino UNO • Embedded C++ • Bluetooth • Robotics • Search Algorithms**

<br>

If you found this project useful, consider giving it a ⭐.

</div>
