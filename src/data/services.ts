export const directions = {
  consult: {
    title: 'Start with a focused consultation.',
    description:
      'We’ll work through the decision, the constraints, and the options. The aim is a direction you can act on, whether I help implement it or your team does.',
    items: [
      'Define what needs deciding',
      'Examine the design and technical trade-offs',
      'Agree on a practical next step',
    ],
  },
  redesign: {
    title: 'Start with a product review.',
    description:
      'We’ll examine the experience that’s causing trouble, identify what needs changing, and work out a useful scope before committing to a redesign.',
    items: [
      'Identify where users get stuck',
      'Connect the design issues to the technical constraints',
      'Prioritize the changes worth making',
    ],
  },
  ai: {
    title: 'Find out where AI would help.',
    description:
      'We’ll look at the tasks your users need to complete and where AI could improve them. Then we can decide what to automate, what people should control, and what to test first.',
    items: [
      'Identify a specific use for AI',
      'Design controls and recovery from mistakes',
      'Define an experiment to test the idea',
    ],
  },
  build: {
    title: 'Plan what to build.',
    description:
      'We’ll define who this is for, what it needs to do, and the first useful version. I can then help design and build a custom website, app, or platform.',
    items: [
      'Clarify the purpose and audience',
      'Define a first version and scope',
      'Choose a design and technical approach',
    ],
  },
  product: {
    title: 'An existing product may be enough.',
    description:
      'These products serve different needs. Explore the one that fits what you’re trying to do.',
    items: [
      'Docket — planning, scheduling, and tracking work',
      'LogDate — keeping a lifelog and social journal',
      'Curfew — setting a hard stop for your workday',
    ],
  },
  unsure: {
    title: 'Start by defining the problem.',
    description:
      'Bring the situation you’re stuck on. We’ll work out what needs solving and identify the next useful decision. You don’t need to know the solution yet.',
    items: [
      'Describe what needs to improve',
      'Identify the assumptions worth testing',
      'Find a next step you can act on',
    ],
  },
} as const;
export type ServiceNeed = keyof typeof directions;
export const serviceChoices: { value: ServiceNeed; label: string }[] = [
  { value: 'consult', label: 'A product or technical decision' },
  { value: 'redesign', label: 'Software that needs a rethink' },
  { value: 'ai', label: 'Figuring out where AI fits' },
  { value: 'build', label: 'A website, app, or platform to build' },
  { value: 'product', label: 'An existing product I can use' },
  { value: 'unsure', label: 'I\u2019m still working it out' },
];
