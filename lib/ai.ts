/* ------------------------------------------------------------------
 * AI service abstraction
 * ------------------------------------------------------------------
 * resolveProvider(): if OPENAI_API_KEY (or compatible endpoint) exists,
 * uses a real OpenAI-compatible chat completions API. Otherwise falls
 * back to a transparent rule-based engine so every AI feature remains
 * fully demonstrable without keys. To integrate a real model later,
 * only this file needs to change.
 * ------------------------------------------------------------------ */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface DoubtResult {
  answer: string;
  simple: string;
  steps: string[];
  example: string;
  related: string[];
  nextTopic: string;
  source: "ai" | "knowledge-base";
}

export interface CareerInput {
  degree: string;
  department: string;
  skills: string[];
  interests: string[];
  preferredCareer: string;
  experienceLevel: string;
}

export interface CareerResult {
  headline: string;
  paths: Array<{ title: string; description: string; demand: string; skills: string[] }>;
  skillsToLearn: string[];
  roadmap: Array<{ phase: string; duration: string; items: string[] }>;
  placementPrep: string[];
  interviewPrep: string[];
  projects: string[];
  source: "ai" | "knowledge-base";
}

export const AI_SUGGESTED_QUESTIONS = [
  "What is polymorphism in Java?",
  "Explain normalization in DBMS",
  "How does a deadlock occur in OS?",
  "Difference between TCP and UDP?",
  "What is Big-O time complexity?",
];

/* ------------------------- provider resolution ------------------------- */

interface Provider {
  name: string;
  chat(messages: ChatTurn[], system: string): Promise<string>;
}

function resolveProvider(): Provider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return {
      name: `openai:${model}`,
      async chat(messages, system) {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: system }, ...messages],
            temperature: 0.4,
            max_tokens: 900,
          }),
        });
        if (!res.ok) throw new Error(`AI provider error ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? "";
      },
    };
  }
  return knowledgeProvider;
}

const knowledgeProvider: Provider = {
  name: "knowledge-base",
  async chat(messages, system) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return generateKnowledgeAnswer(lastUser?.content ?? "", messages);
  },
};

export function aiProviderName(): string {
  return resolveProvider().name;
}

/* --------------------------- knowledge base --------------------------- */

interface KBEntry {
  keys: string[];
  topic: string;
  simple: string;
  technical: string;
  steps: string[];
  example: string;
  related: string[];
  nextTopic: string;
}

const KB: KBEntry[] = [
  {
    keys: ["polymorphism", "overriding", "overloading"],
    topic: "Polymorphism in Java",
    simple: "Polymorphism means 'many forms' — the same method call behaves differently depending on the object that receives it.",
    technical:
      "Polymorphism in Java has two forms: compile-time (method overloading — same name, different parameter lists, resolved by the compiler) and runtime (method overriding — a subclass provides its own implementation of an inherited method, resolved through dynamic dispatch on the JVM's vtable).",
    steps: [
      "Identify the common behavior and declare it in a parent class or interface.",
      "Let each subclass override the method with its own implementation.",
      "Hold objects in a variable typed as the parent (e.g., Animal a = new Dog();).",
      "When you call a.method(), the JVM picks the override belonging to the actual object at runtime.",
    ],
    example:
      "class Shape { double area() { return 0; } }\nclass Circle extends Shape { double area() { return 3.14 * r * r; } }\nclass Rect extends Shape { double area() { return w * h; } }\n\nShape s = new Circle();   // parent reference, child object\nSystem.out.println(s.area());  // runs Circle.area()",
    related: ["Inheritance", "Abstraction", "Interfaces", "Method Overriding vs Overloading", "SOLID principles"],
    nextTopic: "Abstraction and abstract classes vs interfaces",
  },
  {
    keys: ["normalization", "normal forms", "1nf", "2nf", "3nf", "bcnf"],
    topic: "Normalization in DBMS",
    simple: "Normalization is organizing tables so data is stored once, avoiding duplicate and inconsistent data.",
    technical:
      "Normalization decomposes relations to eliminate anomalies. 1NF removes repeating groups (atomic values); 2NF removes partial dependencies (non-key attributes depending on part of a composite key); 3NF removes transitive dependencies (non-key → non-key); BCNF requires every determinant to be a candidate key.",
    steps: [
      "Put the relation in 1NF: atomic columns, no repeating groups.",
      "Move to 2NF: split attributes that depend only on part of a composite key.",
      "Move to 3NF: move attributes that depend on other non-key attributes into their own table.",
      "Check BCNF when in doubt: every determinant must be a candidate key.",
      "Verify joins reconstruct the original data (lossless-join property).",
    ],
    example:
      "StudentCourse(rollNo, courseID, courseName, grade) has a partial dependency:\ncourseID → courseName. So decompose:\n  Courses(courseID, courseName)\n  Enrollments(rollNo, courseID, grade)",
    related: ["Functional Dependencies", "Primary & Foreign Keys", "Joins", "Denormalization trade-offs", "ACID"],
    nextTopic: "Indexes and query optimization",
  },
  {
    keys: ["deadlock", "deadlocks"],
    topic: "Deadlock in Operating Systems",
    simple: "A deadlock is when two or more processes each hold a resource and wait forever for the other's resource.",
    technical:
      "Deadlock requires all four Coffman conditions simultaneously: mutual exclusion, hold-and-wait, no preemption, and circular wait. OS-level strategies are prevention (break a condition), avoidance (Banker's algorithm), detection (wait-for graph + recovery), or ignoring it (ostrich algorithm, used by most general-purpose OSes).",
    steps: [
      "Check mutual exclusion: is the resource non-shareable?",
      "Check hold-and-wait: does a process hold one resource while requesting another?",
      "Check no preemption: can the OS forcibly take resources away?",
      "Check circular wait: P1 waits for P2, P2 waits for P1?",
      "All four true → deadlock exists. Break any one condition to prevent it.",
    ],
    example:
      "Thread A: lock(X) then lock(Y)\nThread B: lock(Y) then lock(X)\nA holds X waits Y; B holds Y waits X → circular wait → deadlock.\nFix: both threads acquire locks in the same order (X then Y).",
    related: ["Process Synchronization", "Semaphores", "Banker's Algorithm", "Race Conditions", "Threads"],
    nextTopic: "Process scheduling algorithms (FCFS, SJF, Round Robin)",
  },
  {
    keys: ["tcp", "udp"],
    topic: "TCP vs UDP",
    simple: "TCP is a reliable, ordered courier; UDP is a fast, fire-and-forget postcard service.",
    technical:
      "TCP is connection-oriented: 3-way handshake, sequence numbers, acknowledgements, retransmission, flow & congestion control — reliable byte stream. UDP is connectionless: no handshake, no delivery guarantee, minimal overhead (8-byte header), preserves message boundaries — suited to realtime traffic.",
    steps: [
      "Ask: is reliability required? If data must arrive complete → TCP.",
      "Is latency critical (video calls, gaming, DNS)? → UDP.",
      "TCP needs a connection setup (SYN, SYN-ACK, ACK) before data flows.",
      "UDP just sends datagrams — faster, but you handle loss/reordering yourself.",
    ],
    example:
      "Web page load (needs every byte, in order) → TCP port 443.\nLive video call (fresh frames matter more than old ones) → UDP.",
    related: ["Three-way Handshake", "OSI & TCP/IP layers", "Ports & Sockets", "HTTP/3 and QUIC", "Flow Control"],
    nextTopic: "How the three-way handshake works",
  },
  {
    keys: ["big-o", "time complexity", "complexity", "o(n)"],
    topic: "Big-O Time Complexity",
    simple: "Big-O describes how an algorithm's running time grows as input grows — the shape of the curve, not the exact speed.",
    technical:
      "Big-O gives an upper bound on growth rate, ignoring constants and lower-order terms. Common classes: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ). Nested loops that each run n times give O(n²); halving the problem each step (binary search) gives O(log n).",
    steps: [
      "Count the dominant operation (usually comparisons or data touches).",
      "Express the count in terms of input size n.",
      "Drop constants: 3n + 5 → O(n).",
      "Keep only the fastest-growing term: n² + n → O(n²).",
      "For recursion, solve the recurrence (Master theorem) or count levels × work per level.",
    ],
    example:
      "for (i=0;i<n;i++) sum+=a[i];          → O(n)\nfor (i...) for (j...) check(a[i],a[j]); → O(n²)\nbinary search halves the range → O(log n)",
    related: ["Space Complexity", "Best vs Worst Case", "Recursion & Master Theorem", "Arrays vs Linked Lists", "Sorting algorithms"],
    nextTopic: "Recursion and the Master Theorem",
  },
  {
    keys: ["linked list", "linkedlist"],
    topic: "Linked Lists",
    simple: "A linked list stores each element in a node with a pointer to the next node — like a treasure hunt where each clue points to the next.",
    technical:
      "A singly linked list is a chain of nodes (data + next pointer); insertion/deletion at a known node is O(1) versus O(n) array shifting, but indexed access is O(n) and each node costs pointer memory. Doubly linked lists add a prev pointer for backward traversal; circular lists link tail → head.",
    steps: [
      "Define a Node class with data and next.",
      "Keep a head reference; for O(1) appends, also keep a tail.",
      "Insert: rewire pointers — newNode.next = current.next; current.next = newNode.",
      "Delete: previous.next = nodeToDelete.next (watch the head case).",
      "Traverse: start at head, follow next until null.",
    ],
    example:
      "class Node { int data; Node next; }\nNode a = new Node(1); Node b = new Node(2);\na.next = b;  // list: 1 → 2",
    related: ["Arrays vs Linked Lists", "Stacks & Queues", "Two-pointer technique", "Doubly Linked Lists", "Hash Tables"],
    nextTopic: "Stacks and Queues",
  },
  {
    keys: ["sql join", "joins", "inner join", "left join"],
    topic: "SQL Joins",
    simple: "A JOIN combines rows from two tables using a matching column — like merging two class lists by roll number.",
    technical:
      "INNER JOIN keeps only matching rows; LEFT JOIN keeps all left rows (NULL-filled where no match); RIGHT JOIN mirrors it; FULL OUTER keeps both sides; CROSS JOIN is the cartesian product. Conceptually it's a filtered cartesian product via the ON predicate.",
    steps: [
      "Identify the two tables and the linking column (usually a foreign key).",
      "Pick the join type: need every row of one side? → LEFT/RIGHT; only matches → INNER.",
      "Write FROM a JOIN b ON a.key = b.key.",
      "Filter with WHERE afterwards; aggregate with GROUP BY if needed.",
    ],
    example:
      "SELECT s.name, c.course_name\nFROM enrollments e\nJOIN students s ON e.roll_no = s.roll_no\nJOIN courses  c ON e.course_id = c.course_id;",
    related: ["Primary & Foreign Keys", "GROUP BY & Aggregates", "Subqueries", "Indexes", "Normalization"],
    nextTopic: "GROUP BY, HAVING and aggregate functions",
  },
  {
    keys: ["pointer", "pointers"],
    topic: "Pointers in C",
    simple: "A pointer is a variable that stores the memory address of another variable — a signpost pointing at data.",
    technical:
      "A pointer holds an address; *p dereferences (accesses the pointed-to value), &x takes the address of x. Pointers enable pass-by-reference, dynamic memory (malloc/free), and data structures like linked lists. Dangling pointers, wild pointers, and memory leaks are the classic pitfalls.",
    steps: [
      "Declare: int *p; — p can hold the address of an int.",
      "Assign: p = &x; — p now points at x.",
      "Dereference: *p = 5; — writes 5 into x through the pointer.",
      "For dynamic memory: p = malloc(n * sizeof(int)); always pair with free(p).",
      "Set p = NULL after freeing to avoid dangling pointers.",
    ],
    example:
      "int x = 10;\nint *p = &x;\n*p = 20;      // x is now 20\nprintf(\"%d\", x);",
    related: ["Arrays & Pointer Arithmetic", "Dynamic Memory (malloc/free)", "Call by Reference", "Structures", "NULL pointers"],
    nextTopic: "Dynamic memory allocation in C",
  },
  {
    keys: ["recursion", "recursive"],
    topic: "Recursion",
    simple: "Recursion is when a function solves a big problem by calling itself on a smaller version of the same problem.",
    technical:
      "Every recursive function needs a base case (stopping condition) and a recursive case that strictly reduces the problem. Calls are pushed on the call stack; deep recursion can overflow it. Tail recursion can be optimized to a loop; many recursive algorithms (merge sort, tree traversal) map naturally to the problem structure.",
    steps: [
      "Define the base case — the smallest input answered directly.",
      "Define the recursive case — combine the answer of a smaller input.",
      "Ensure each call moves strictly toward the base case.",
      "Trace the call stack on a small input to verify.",
      "Consider memoization if subproblems repeat (e.g., naive fibonacci).",
    ],
    example:
      "int fact(int n) {\n  if (n <= 1) return 1;      // base case\n  return n * fact(n - 1);    // recursive case\n}",
    related: ["Call Stack", "Base Case Design", "Dynamic Programming", "Tree Traversals", "Backtracking"],
    nextTopic: "Dynamic programming and memoization",
  },
  {
    keys: ["oop", "object oriented", "encapsulation", "inheritance", "abstraction"],
    topic: "Object-Oriented Programming (OOP)",
    simple: "OOP models software as objects that bundle data and the operations on that data — like blueprints (classes) and houses built from them (instances).",
    technical:
      "The four pillars: Encapsulation (hide internal state, expose behavior), Inheritance (reuse and extend a parent type), Polymorphism (one interface, many implementations), Abstraction (expose what, hide how). Java, C++, C#, and Python all implement these with different syntax.",
    steps: [
      "Identify nouns in the problem — they become classes.",
      "Bundle related fields privately (encapsulation) and expose methods.",
      "Extract shared behavior into a parent class (inheritance).",
      "Program to interfaces so implementations can vary (polymorphism/abstraction).",
    ],
    example:
      "abstract class Payment { abstract void pay(double amt); }\nclass UPI extends Payment { void pay(double a) { /* upi logic */ } }\nclass Card extends Payment { void pay(double a) { /* card logic */ } }\nPayment p = new UPI(); p.pay(500);",
    related: ["Polymorphism", "Encapsulation", "Interfaces", "Design Patterns", "SOLID principles"],
    nextTopic: "Polymorphism in depth",
  },
  {
    keys: ["flexbox", "grid", "css layout"],
    topic: "CSS Flexbox vs Grid",
    simple: "Flexbox arranges items in one direction (row or column); Grid lays out in rows AND columns simultaneously.",
    technical:
      "Flexbox is one-dimensional with content-driven sizing (flex-grow/shrink/basis, justify-content, align-items). Grid is two-dimensional with template rows/columns, gap, and placement (grid-template-areas). Use Grid for page layout, Flexbox for component internals — they compose well together.",
    steps: [
      "Decide: one direction? → Flexbox. Rows + columns? → Grid.",
      "Flexbox: set display:flex on the parent, control direction with flex-direction.",
      "Distribute space with justify-content (main axis) and align-items (cross axis).",
      "Grid: define columns with grid-template-columns, place items with grid-column/row.",
      "Use gap instead of margins for both.",
    ],
    example:
      "/* nav bar: flex */ .nav { display:flex; justify-content:space-between; }\n/* gallery: grid */ .gallery { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }",
    related: ["Responsive Design", "CSS Box Model", "Media Queries", "Tailwind CSS", "CSS Specificity"],
    nextTopic: "Responsive design with media queries",
  },
  {
    keys: ["linear regression", "regression", "machine learning basics"],
    topic: "Linear Regression",
    simple: "Linear regression draws the best-fit straight line through data points so you can predict a number from inputs.",
    technical:
      "Model: ŷ = w·x + b. Training minimizes Mean Squared Error, typically via gradient descent: repeatedly update w ← w − α·∂MSE/∂w. Evaluation uses R², RMSE. Assumptions: linearity, independence, homoscedasticity, normal residuals. Multiple linear regression extends x to a vector.",
    steps: [
      "Plot the data to check a roughly linear relationship.",
      "Initialize w, b (often 0) and choose a learning rate α.",
      "Repeat: compute predictions, gradients, and update w and b.",
      "Evaluate with R² / RMSE on held-out data.",
      "Check assumptions and residual plots before trusting it.",
    ],
    example:
      "from sklearn.linear_model import LinearRegression\nmodel = LinearRegression().fit(X_train, y_train)\nprint(model.coef_, model.intercept_)",
    related: ["Gradient Descent", "Overfitting & Regularization", "Logistic Regression", "Feature Scaling", "Train/Test Split"],
    nextTopic: "Logistic regression and classification",
  },
  {
    keys: ["react", "hooks", "usestate", "useeffect"],
    topic: "React Hooks",
    simple: "Hooks let function components remember things and react to changes — useState remembers, useEffect reacts.",
    technical:
      "useState returns [value, setter] and re-renders on set; useEffect runs side effects after render with a dependency array controlling re-runs (cleanup function for teardown). Rules of hooks: call unconditionally at the top level. Additional hooks: useMemo (cache computation), useCallback (cache function), useRef (mutable box / DOM handle), useContext (read context).",
    steps: [
      "Import { useState, useEffect } from 'react'.",
      "const [count, setCount] = useState(0) — state local to the component.",
      "Call setCount(newVal) — React re-renders with the new value.",
      "useEffect(() => { ...; return cleanup; }, [deps]) for subscriptions, timers, fetching.",
      "List every reactive value used inside the effect in the deps array.",
    ],
    example:
      "function Timer() {\n  const [s, setS] = useState(0);\n  useEffect(() => {\n    const id = setInterval(() => setS(x => x + 1), 1000);\n    return () => clearInterval(id);   // cleanup\n  }, []);\n  return <p>{s}s</p>;\n}",
    related: ["Component State", "Props & Context", "useMemo / useCallback", "Custom Hooks", "React Server Components"],
    nextTopic: "Custom hooks and context API",
  },
  {
    keys: ["spring boot", "spring"],
    topic: "Spring Boot Basics",
    simple: "Spring Boot is a framework that lets you build production-ready Java backends with minimal configuration — annotation-driven web apps with an embedded server.",
    technical:
      "Spring Boot auto-configures an application from classpath starters (spring-boot-starter-web → embedded Tomcat + Spring MVC). Controllers map HTTP routes (@RestController, @GetMapping), services hold business logic, repositories (Spring Data JPA) map to the database, and application.properties/yml externalizes config. Dependency injection wires beans together.",
    steps: [
      "Create a project via start.spring.io with the Web + Data starters.",
      "Define an entity (JPA) and a repository interface extending JpaRepository.",
      "Write a @RestController with @GetMapping/@PostMapping methods.",
      "Put business logic in a @Service class injected via constructor.",
      "Configure the datasource in application.properties and run SpringApplication.run().",
    ],
    example:
      "@RestController\n@RequestMapping(\"/api/students\")\nclass StudentController {\n  @GetMapping\n  List<Student> all() { return repo.findAll(); }\n}",
    related: ["Dependency Injection", "REST APIs", "JPA & Hibernate", "Microservices", "Maven/Gradle"],
    nextTopic: "Building REST APIs with Spring Data JPA",
  },
  {
    keys: ["operating system", "process", "thread", "scheduling"],
    topic: "Processes, Threads & Scheduling",
    simple: "A process is a program in execution with its own memory; threads are workers inside it sharing that memory; the scheduler decides who runs when.",
    technical:
      "Processes have isolated address spaces; threads within a process share heap but have own stack/registers — cheaper context switches. Scheduling algorithms: FCFS (simple, convoy effect), SJF (optimal average waiting time, needs prediction), Round Robin (fair, quantum-based, good response time), Priority (starvation risk → aging).",
    steps: [
      "Distinguish process (own memory) vs thread (shared memory workers).",
      "Learn each scheduler's metric: waiting time, turnaround, response.",
      "FCFS: run in arrival order — simple but convoy effect on long jobs.",
      "SJF: shortest job first — optimal avg waiting, but needs burst estimates.",
      "Round Robin: fixed quantum, cycles through ready queue — fair + responsive.",
    ],
    example:
      "Jobs: P1(24ms) P2(3ms) P3(3ms)\nFCFS avg wait = (0+24+27)/3 = 17ms\nSJF  avg wait = (6+0+3)/3 = 3ms  ← order P2,P3,P1",
    related: ["Context Switching", "Deadlocks", "Synchronization", "CPU vs IO Bound", "Virtual Memory"],
    nextTopic: "Synchronization: semaphores and mutexes",
  },
];

function findEntry(q: string): KBEntry | null {
  const s = q.toLowerCase();
  let best: KBEntry | null = null;
  let bestScore = 0;
  for (const e of KB) {
    let score = 0;
    for (const k of e.keys) if (s.includes(k)) score += k.length;
    if (score > bestScore) { best = e; bestScore = score; }
  }
  return best;
}

function generateKnowledgeAnswer(question: string, history: ChatTurn[]): string {
  const e = findEntry(question);
  if (e) {
    return [
      `**${e.topic}**`,
      "",
      "**Simple explanation**",
      e.simple,
      "",
      "**Technical explanation**",
      e.technical,
      "",
      "**Step by step**",
      ...e.steps.map((s, i) => `${i + 1}. ${s}`),
      "",
      "**Example**",
      "```",
      e.example,
      "```",
      "",
      "**Related concepts** " + e.related.join(" · "),
      "",
      `_Suggested next topic: ${e.nextTopic}_`,
      "",
      "_INTERACTA knowledge-base mode — configure OPENAI_API_KEY for full generative answers._",
    ].join("\n");
  }
  return genericAcademicAnswer(question, history);
}

function genericAcademicAnswer(question: string, _history: ChatTurn[]): string {
  const q = question.trim().replace(/\s+/g, " ");
  const short = q.length > 90 ? q.slice(0, 90) + "…" : q;
  const subjectGuess = detectSubject(q);
  const cleanSubject = subjectGuess === "General Studies" ? "this subject" : subjectGuess;
  return [
    `**About: ${short}**`,
    "",
    "**Simple explanation**",
    `Here is the core idea: start from the definition, then connect "${short}" to concepts you already know in ${cleanSubject}. Most exam questions on this topic test whether you can (1) define it precisely, (2) explain why it exists — the problem it solves — and (3) apply it to a small example.`,
    "",
    "**Technical explanation**",
    `In ${cleanSubject}, this topic sits between fundamentals and applications. Break it into inputs → transformation → outputs. Identify the constraints, the invariants that must hold, and the standard notation used in your syllabus. If the topic involves a formula, write it down and label each term; if it involves a process, enumerate the steps and note where errors typically occur.`,
    "",
    "**Step by step**",
    "1. Restate the question in your own words — what exactly is being asked?",
    "2. Recall the formal definition and key terms.",
    "3. Identify the problem it solves (why the concept exists).",
    "4. Work one concrete example end-to-end.",
    "5. Summarize the takeaways in 2-3 bullet points for revision.",
    "",
    "**Example**",
    `Take a minimal example from ${cleanSubject}: define the smallest input, apply the concept manually, and verify the result against the definition. Repeat once with a changed input to test your understanding.`,
    "",
    "**Related concepts** " + relatedFor(subjectGuess).join(" · "),
    "",
    `_Suggested next topic: build a one-page summary sheet of this area and attempt 3 practice problems._`,
    "",
    "_INTERACTA knowledge-base mode — configure OPENAI_API_KEY for full generative answers._",
  ].join("\n");
}

export function detectSubject(q: string): string {
  const s = q.toLowerCase();
  if (/(java|python|c\+\+|code|program|array|function|class|loop)/.test(s)) return "Programming";
  if (/(sql|database|dbms|table|query|normal)/.test(s)) return "DBMS";
  if (/(network|tcp|udp|osi|protocol|packet)/.test(s)) return "Computer Networks";
  if (/(os|deadlock|process|thread|schedul)/.test(s)) return "Operating Systems";
  if (/(integral|derivative|matrix|probability|equation|math)/.test(s)) return "Mathematics";
  if (/(circuit|semiconductor|signal|voltage)/.test(s)) return "Electronics";
  if (/(machine learning|regression|neural|dataset|model)/.test(s)) return "Machine Learning";
  if (/(thermo|beam|stress|machine design|fluid)/.test(s)) return "Mechanical Engineering";
  return "General Studies";
}

function relatedFor(subject: string): string[] {
  const map: Record<string, string[]> = {
    Programming: ["Data Structures", "Time Complexity", "OOP", "Debugging techniques"],
    DBMS: ["ER Modeling", "Normalization", "Transactions & ACID", "Indexes"],
    "Computer Networks": ["Layered architecture", "Routing", "TCP vs UDP", "Network security basics"],
    "Operating Systems": ["Process scheduling", "Deadlocks", "Memory management", "File systems"],
    Mathematics: ["Linear algebra", "Calculus", "Probability & Statistics", "Discrete math"],
    Electronics: ["Digital logic", "Microcontrollers", "Signals & Systems", "Communication basics"],
    "Machine Learning": ["Supervised learning", "Model evaluation", "Feature engineering", "Overfitting"],
    "Mechanical Engineering": ["Statics & dynamics", "Thermodynamics", "Machine design", "Manufacturing processes"],
  };
  return map[subject] ?? ["Core definitions", "Worked examples", "Previous-year questions", "Standard textbooks"];
}

/* ----------------------------- doubt solver ----------------------------- */

export async function solveDoubt(question: string): Promise<DoubtResult> {
  const e = findEntry(question);
  if (e) {
    return {
      answer: e.technical,
      simple: e.simple,
      steps: e.steps,
      example: e.example,
      related: e.related,
      nextTopic: e.nextTopic,
      source: "knowledge-base",
    };
  }
  const subjectGuess = detectSubject(question);
  return {
    answer: `A structured approach to "${question.trim()}": this is a core ${subjectGuess} topic. The answer typically combines a precise definition, the problem it solves, and one worked application.`,
    simple: `Think of it as a recipe: you have inputs, a fixed procedure, and a guaranteed output. Master the procedure on one small example and the exam version becomes a variation of the same steps.`,
    steps: [
      "Write down the exact definition from your prescribed textbook.",
      "Note WHY the concept exists — what problem does it solve?",
      "Work one solved example from your notes end-to-end without looking.",
      "Change one input and redo it — this exposes what each term controls.",
      "Attempt 3 previous-year questions on this topic.",
    ],
    example: `Example: take the smallest meaningful case from ${subjectGuess}, solve it manually, then verify each step against the definition above.`,
    related: relatedFor(subjectGuess),
    nextTopic: "Build a one-page revision sheet, then practice previous-year questions",
    source: "knowledge-base",
  };
}

/* --------------------------- assistant chat --------------------------- */

const ASSISTANT_SYSTEM = `You are INTERACTA Assistant, a friendly academic helper for college students.
Explain concepts clearly: start with a simple explanation, then add technical depth, give an example,
and suggest follow-up topics. Use markdown-ish formatting with **bold** section labels. Keep answers
under 350 words unless asked for more.`;

export async function assistantReply(history: ChatTurn[]): Promise<string> {
  const provider = resolveProvider();
  try {
    const last = [...history].reverse().find((m) => m.role === "user");
    const text = last?.content ?? "";
    const e = findEntry(text);
    if (provider.name !== "knowledge-base" && e) {
      // still fine to hit the real model; fall through
    }
    return await provider.chat(history, ASSISTANT_SYSTEM);
  } catch {
    const last = [...history].reverse().find((m) => m.role === "user");
    return generateKnowledgeAnswer(last?.content ?? "", history);
  }
}

/* --------------------------- career guidance --------------------------- */

export function careerGuidance(input: CareerInput): CareerResult {
  const skills = input.skills.map((s) => s.toLowerCase());
  const interests = input.interests.map((s) => s.toLowerCase());
  const all = [...skills, ...interests].join(" ");
  const has = (...keys: string[]) => keys.some((k) => all.includes(k));
  const dept = input.department.toLowerCase();

  let track: "software" | "data" | "hardware" | "mechanical" | "business" | "general" = "general";
  if (has("software", "web", "frontend", "backend", "full stack", "java", "javascript", "react", "python", "developer", "app")) track = "software";
  else if (has("data", "machine learning", "ai", "analytics", "analyst", "science")) track = "data";
  else if (has("embedded", "iot", "vlsi", "electronics", "hardware", "chip")) track = "hardware";
  else if (has("mechanical", "design engineer", "automotive", "cad", "thermal", "manufacturing")) track = "mechanical";
  else if (/(cse|computer|information technology|it\b)/.test(dept)) track = "software";
  else if (/(ece|electrical|electronics)/.test(dept)) track = "hardware";
  else if (/(mech)/.test(dept)) track = "mechanical";
  else if (/(mba|business|management|bba)/.test(dept)) track = "business";

  const catalog: Record<string, Omit<CareerResult, "source" | "headline">> = {
    software: {
      paths: [
        { title: "Software Engineer (Product)", description: "Build user-facing features at product companies; strong CS fundamentals + DSA interviews.", demand: "Very High", skills: ["DSA", "System design basics", "Git", "One strong language"] },
        { title: "Full-Stack Developer", description: "Own features end-to-end: React frontends + Node/Spring backends + SQL databases.", demand: "High", skills: ["React", "Node.js or Spring Boot", "SQL", "REST APIs"] },
        { title: "Backend / API Engineer", description: "Design scalable services, queues, and databases behind the product.", demand: "High", skills: ["Java/Spring or Node", "SQL & caching", "Docker", "Linux"] },
      ],
      skillsToLearn: ["DSA in Java/Python (150+ problems)", "Git & GitHub workflow", "SQL joins & indexes", "Build & deploy 2 full-stack projects", "Docker basics", "Unit testing"],
      roadmap: [
        { phase: "Phase 1 · Foundations", duration: "Weeks 1-6", items: ["Pick one language (Java or Python) and master syntax + OOP", "Solve 50 easy DSA problems (arrays, strings, hashing)", "Learn Git: branch, commit, PR workflow"] },
        { phase: "Phase 2 · Core Skills", duration: "Weeks 7-14", items: ["Linked lists, trees, graphs: 50 more problems", "Build a full-stack CRUD project with auth", "SQL: joins, group by, indexes"] },
        { phase: "Phase 3 · Depth & Projects", duration: "Weeks 15-22", items: ["System design basics: caching, load balancing, DB scaling", "Second project with deployment (Vercel/Render + CI)", "Dynamic programming patterns"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 23-26", items: ["Mock interviews (2 per week)", "Company-specific previous papers", "Resume: quantify project impact, one page"] },
      ],
      placementPrep: ["Maintain a 150+ problem DSA log (LeetCode/Codeforces)", "Aptitude practice: 30 min daily (quant + logical)", "Prepare a 90-second self-introduction", "Keep GitHub green: push project work weekly"],
      interviewPrep: ["OOP: explain the 4 pillars with one code example each", "Explain your project architecture in 3 minutes", "Common questions: hashmap internals, SQL joins, HTTP lifecycle", "Behavioral: STAR-format stories for teamwork and failure"],
      projects: ["Campus events platform with auth + role-based dashboards", "Realtime chat app (WebSockets) with read receipts", "Expense tracker with charts + CSV export", "URL shortener with analytics dashboard"],
    },
    data: {
      paths: [
        { title: "Data Analyst", description: "Turn raw data into dashboards and decisions with SQL, Excel and BI tools.", demand: "High", skills: ["SQL", "Excel", "Power BI / Tableau", "Statistics basics"] },
        { title: "Data Scientist", description: "Model building: prediction, classification, forecasting with ML libraries.", demand: "Very High", skills: ["Python", "pandas/scikit-learn", "Statistics", "Storytelling"] },
        { title: "ML Engineer", description: "Ship models to production: pipelines, APIs, monitoring.", demand: "Very High", skills: ["Python", "ML lifecycle", "Docker", "Cloud basics"] },
      ],
      skillsToLearn: ["SQL (window functions, CTEs)", "Python: pandas, numpy, matplotlib", "Statistics: distributions, hypothesis testing", "scikit-learn: 3 end-to-end models", "Dashboarding in Power BI or Tableau", "Kaggle: 2 competitions"],
      roadmap: [
        { phase: "Phase 1 · Foundations", duration: "Weeks 1-6", items: ["Python + pandas crash course", "Descriptive statistics & visualization", "SQL: select, join, group by"] },
        { phase: "Phase 2 · Core ML", duration: "Weeks 7-14", items: ["Linear & logistic regression from scratch", "Model evaluation: precision/recall, ROC", "Kaggle Titanic + one tabular competition"] },
        { phase: "Phase 3 · Projects", duration: "Weeks 15-22", items: ["End-to-end project: data → model → dashboard", "Time-series forecasting project", "Write 2 blog posts explaining your projects"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 23-26", items: ["Case-study interviews practice (guesstimates, metrics)", "SQL interview drills (window functions)", "Portfolio: GitHub + 2 polished notebooks"] },
      ],
      placementPrep: ["2 Kaggle competitions with write-ups", "SQL drills: 40 questions (joins, windows)", "Aptitude + statistics MCQ practice", "Portfolio site or GitHub README with project narratives"],
      interviewPrep: ["Explain bias-variance trade-off simply", "Walk through one project: data cleaning → model → impact", "Common questions: p-values, overfitting, precision vs recall", "Guesstimate practice: market sizing, fleet utilization"],
      projects: ["Student performance predictor using college data patterns", "Sales dashboard with forecasting", "Sentiment analysis of product reviews", "Recommendation engine (movies or courses)"],
    },
    hardware: {
      paths: [
        { title: "Embedded Systems Engineer", description: "Program microcontrollers and build firmware for smart devices.", demand: "High", skills: ["C/C++", "8051/ARM", "RTOS basics", "Serial protocols"] },
        { title: "IoT Solutions Engineer", description: "Connect devices to cloud: sensors, gateways, dashboards.", demand: "High", skills: ["MQTT", "Python", "Cloud IoT platforms", "Basic networking"] },
        { title: "VLSI / Chip Design Trainee", description: "Digital design, Verilog, verification flows in semiconductor firms.", demand: "Growing", skills: ["Verilog", "Digital logic", "STA basics", "Linux scripting"] },
      ],
      skillsToLearn: ["Embedded C on 8051/ARM (LED → sensor → UART projects)", "Serial: UART, I2C, SPI", "RTOS concepts: tasks, queues, semaphores", "IoT: MQTT + one cloud dashboard", "PCB basics & soldering", "Verilog HDL (if VLSI track)"],
      roadmap: [
        { phase: "Phase 1 · Foundations", duration: "Weeks 1-6", items: ["Strong C: pointers, bit manipulation", "Digital electronics refresher", "Breadboard + Arduino kit experiments"] },
        { phase: "Phase 2 · Embedded Core", duration: "Weeks 7-14", items: ["8051/STM32 timer, interrupt, UART programs", "I2C sensor integration (temp, accelerometer)", "Mini project: home automation node"] },
        { phase: "Phase 3 · IoT Integration", duration: "Weeks 15-22", items: ["MQTT + Node-RED/cloud dashboard", "OTA updates and power optimization basics", "Documented project with circuit diagrams"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 23-26", items: ["Core subject revision (EDC, DE, MPMC)", "Firmware interview questions practice", "Core companies shortlist + referrals"] },
      ],
      placementPrep: ["Revise EDC, digital logic, microprocessors MCQs", "2 hardware mini-projects with documentation", "Aptitude + core mock tests weekly", "LinkedIn presence: post project demos"],
      interviewPrep: ["Explain interrupt vs polling with example", "I2C vs SPI vs UART trade-offs", "What happens when power-on reset occurs", "Debug a non-working circuit: systematic approach"],
      projects: ["Smart energy meter with cloud dashboard", "Line-follower + obstacle-avoid robot", "Weather station with MQTT logging", "Digital code lock with EEPROM"],
    },
    mechanical: {
      paths: [
        { title: "Design Engineer", description: "CAD-driven product design: parts, assemblies, tolerances, drawings.", demand: "Steady", skills: ["SolidWorks/CATIA", "GD&T", "Materials", "FEA basics"] },
        { title: "Manufacturing / Production Engineer", description: "Optimize processes, quality, and throughput on the shop floor.", demand: "Steady", skills: ["Lean", "Six Sigma", "CNC basics", "Quality control"] },
        { title: "Thermal / HVAC Engineer", description: "Thermal systems design for HVAC, power, and process industries.", demand: "Steady", skills: ["Thermodynamics", "Heat transfer", "CFD basics", "Standards (ASHRAE)"] },
      ],
      skillsToLearn: ["SolidWorks CSWA certification", "GD&T fundamentals", "FEA basics (Ansys student)", "Excel + Python for engineering calc automation", "Engineering drawing standards", "One industry internship"],
      roadmap: [
        { phase: "Phase 1 · Foundations", duration: "Weeks 1-6", items: ["Engineering drawing + GD&T", "SolidWorks: sketch → part → assembly", "Thermodynamics revision"] },
        { phase: "Phase 2 · Software Skills", duration: "Weeks 7-14", items: ["CSWA preparation + attempt", "FEA on a simple bracket (Ansys)", "Automate a calc sheet in Python/Excel"] },
        { phase: "Phase 3 · Projects", duration: "Weeks 15-22", items: ["Design a gearbox or fixture with full drawings", "Simulate + validate against hand calcs", "Society/club leadership role"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 23-26", items: ["Core companies aptitude tests", "Manufacturing processes revision", "Internship conversion or off-campus drives"] },
      ],
      placementPrep: ["DOM, TOM, thermo formula sheets", "CSWA/CSWP certification", "Aptitude tests of core companies (Tata, L&T, Ashok Leyland)", "Drawings portfolio (PDF)"],
      interviewPrep: ["Explain a design decision with calculations", "Stress-strain curve and material selection logic", "GD&T symbols you have actually used", "Why manufacturing: shop-floor readiness stories"],
      projects: ["Go-kart/chassis design with FEA validation", "Automated sorting mechanism prototype", "Heat exchanger design optimization", "3D-printed functional assembly"],
    },
    business: {
      paths: [
        { title: "Business Analyst", description: "Bridge business and tech: requirements, process maps, dashboards.", demand: "High", skills: ["Excel", "SQL", "Process mapping", "Communication"] },
        { title: "Product Management (APM)", description: "Own product decisions: users, metrics, roadmaps.", demand: "Competitive", skills: ["User research", "Analytics", "Roadmapping", "Storytelling"] },
        { title: "Operations / Supply Chain", description: "Optimize logistics, procurement and service delivery.", demand: "Steady", skills: ["Excel modeling", "Lean", "Vendor management", "ERP basics"] },
      ],
      skillsToLearn: ["Excel: pivot tables, lookups, modeling", "SQL basics", "Tableau/Power BI", "Case-study frameworks", "Business communication & slide design", "One live internship"],
      roadmap: [
        { phase: "Phase 1 · Foundations", duration: "Weeks 1-6", items: ["Excel mastery + business metrics", "Read: 'The McKinsey Way', case books", "Join the E-cell or clubs for leadership"] },
        { phase: "Phase 2 · Analytics", duration: "Weeks 7-14", items: ["SQL + Tableau dashboard project", "Guesstimates and case practice weekly", "Digital marketing basics (GA4)"] },
        { phase: "Phase 3 · Experience", duration: "Weeks 15-22", items: ["Summer internship or live project", "Case competition entries", "LinkedIn presence + networking"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 23-26", items: ["Aptitude + business news daily", "Case + guesstimate mocks", "HR interview stories (STAR)"] },
      ],
      placementPrep: ["Daily business news (15 min)", "Case books from IIM/A-Z prep circles", "Excel speed drills", "3 deep-dive company research docs"],
      interviewPrep: ["Guesstimate: 'Cups of chai sold at our campus gate daily'", "Market-entry case framework", "Metrics: define success for a campus app", "Why management: consistent narrative"],
      projects: ["Market research study with real survey data", "Campus fest P&L + sponsorship deck", "Operations dashboard for a local business", "Competitive teardown of a popular app"],
    },
    general: {
      paths: [
        { title: "Software / IT Services Engineer", description: "Service companies hire across departments with aptitude + basics + attitude.", demand: "High", skills: ["One language", "SQL basics", "Aptitude", "Communication"] },
        { title: "Higher Studies / GATE", description: "M.Tech, MS, or PSU route through GATE with strong core fundamentals.", demand: "Steady", skills: ["Core subjects", "Aptitude", "Consistent schedule"] },
        { title: "Startup / Entrepreneurship", description: "Join early-stage startups for fast learning and ownership.", demand: "Growing", skills: ["Execution", "Versatility", "Networking"] },
      ],
      skillsToLearn: ["One programming language to comfort level", "SQL basics", "Aptitude: quant + logical daily", "Communication: written + spoken", "Resume + LinkedIn polish", "Explore 2 fields via mini-projects"],
      roadmap: [
        { phase: "Phase 1 · Explore", duration: "Weeks 1-8", items: ["Try 3 mini-experiments across your interests", "Daily aptitude habit", "Talk to 3 seniors/alumni about their paths"] },
        { phase: "Phase 2 · Commit", duration: "Weeks 9-16", items: ["Pick a primary track from experiments", "Start one substantial project", "Core subject revision plan"] },
        { phase: "Phase 3 · Build Proof", duration: "Weeks 17-24", items: ["Finish project with documentation", "Internship applications", "Mock interviews"] },
        { phase: "Phase 4 · Placement Sprint", duration: "Weeks 25-28", items: ["Company research + applications", "Aptitude speed practice", "Final resume + story polish"] },
      ],
      placementPrep: ["Aptitude daily practice", "Core subject revision schedule", "Resume: one page, quantified bullets", "Mock aptitude tests weekly"],
      interviewPrep: ["Self-introduction (60-90 seconds)", "Project walkthrough", "Strength/weakness with examples", "Why this company: specific research"],
      projects: ["A tool solving a real campus problem", "Data analysis of a public dataset", "Blog/documentation of your learning journey", "Volunteer tech support for a club/event"],
    },
  };

  const picked = catalog[track];
  const headline =
    track === "software" ? "Strong software/product engineering trajectory ahead"
    : track === "data" ? "Data-driven career path with strong market demand"
    : track === "hardware" ? "Core electronics & embedded systems pathway"
    : track === "mechanical" ? "Core mechanical design & manufacturing pathway"
    : track === "business" ? "Business analysis & management trajectory"
    : "Exploratory phase — build breadth, then commit to a track";

  return { headline, ...picked, source: "knowledge-base" };
}
