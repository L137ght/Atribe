export const TUTORIAL_STEPS = [
  {
    id: "home",
    screen: "Home",
    title: "Route links from your home workspace",
    body:
      "Paste a destination URL here to generate a creator-attributed smart link. This is the main post-login workspace where shoppers preview who benefits before opening a product.",
    points: [
      "Use the destination URL field to start any routing event.",
      "Your selected tribe and supported creator count are summarized before you route.",
      "Open the generated link or copy it after previewing who gets attribution."
    ],
    nextLabel: "Show discover"
  },
  {
    id: "discover",
    screen: "CreatorDiscovery",
    title: "Search and discover creators",
    body:
      "The discover page is where users search for creators to support. Search by creator name, niche, platform, or supported brand domains, then add them directly to your tribe.",
    points: [
      "Use the top search field to find creators quickly.",
      "Filter chips narrow the list when you want to browse by category.",
      "Add creators here before refining their routing share."
    ],
    nextLabel: "Explain weights"
  },
  {
    id: "weights",
    screen: "CreatorSelection",
    title: "Adjust attribution with weight sliders",
    body:
      "Weight sliders let shoppers suggest how much routing influence each creator should receive. Higher percentages make a creator more likely to be chosen over time.",
    points: [
      "Search within your tribe from this page if you already know who you want to tune.",
      "Use the plus and minus controls to raise or lower each creator's share.",
      "If even split is enabled in settings, these sliders are hidden on purpose."
    ],
    nextLabel: "Open settings"
  },
  {
    id: "settings",
    screen: "Settings",
    title: "Use settings to tune your flow",
    body:
      "Settings is where users manage account details, switch roles, and choose whether attribution uses custom weights or an even split.",
    points: [
      "Switch between shopper and creator roles here.",
      "Change routing mode here when you want equal distribution instead of sliders.",
      "Replay this tutorial from settings any time."
    ],
    nextLabel: "Finish tutorial"
  }
];

export function getTutorialStep(stepId) {
  return TUTORIAL_STEPS.find((step) => step.id === stepId) || null;
}

export function getNextTutorialStep(stepId) {
  const currentIndex = TUTORIAL_STEPS.findIndex((step) => step.id === stepId);

  if (currentIndex < 0 || currentIndex >= TUTORIAL_STEPS.length - 1) {
    return null;
  }

  return TUTORIAL_STEPS[currentIndex + 1];
}
