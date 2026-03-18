import react from "react"
import link from "next/link"

const timeLine = () => {
  return (
    <ul className="timeline timeline-snap-icon text-black max-md:timeline-compact timeline-vertical px-5">
      <li>
        <div className="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="timeline-start mb-10 md:text-end">
          <time className="font-mono italic bg-yellow-400">Step 1</time>
          <div className="text-lg font-black">Tell Us Your Needs</div>
          Users describe what they want from their operating system — development tools, cybersecurity
          environments, AI frameworks, design software, gaming optimizations, or general productivity.
          This helps Operate understand the exact workflow the system needs to support.
        </div>
        <hr />
      </li>

      <li>
        <hr />
        <div className="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="timeline-end md:mb-10">
          <time className="font-mono italic bg-yellow-400">Step 2</time>
          <div className="text-lg font-black">System Configuration</div>
          Based on the user's requirements, Operate selects the appropriate Linux base distribution,
          desktop environment, kernel optimizations, and software packages required for the workflow.
          This stage defines the architecture of the custom OS.
        </div>
        <hr />
      </li>

      <li>
        <hr />
        <div className="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="timeline-start mb-10 md:text-end">
          <time className="font-mono italic bg-yellow-400">Step 3</time>
          <div className="text-lg font-black">Custom Environment Setup</div>
          The selected tools, libraries, drivers, and configurations are integrated into the system.
          The user interface, performance settings, and workflow-specific applications are prepared to
          create a streamlined environment tailored for the user.
        </div>
        <hr />
      </li>

      <li>
        <hr />
        <div className="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="timeline-end md:mb-10">
          <time className="font-mono italic bg-yellow-400">Step 4</time>
          <div className="text-lg font-black">Build the Custom ISO</div>
          Operate compiles the configured system into a bootable ISO image. The OS is packaged with all
          necessary tools, dependencies, and optimizations so the user receives a ready-to-use operating
          system environment.
        </div>
        <hr />
      </li>

      <li>
        <hr />
        <div className="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="timeline-start mb-10 md:text-end">
          <time className="font-mono italic bg-yellow-400">Step 5</time>
          <div className="text-lg font-black">Download & Use</div>
          The user receives the custom ISO image and can boot it on their system or install it directly.
          From the first startup, the operating system is already configured for their workflow,
          providing a personalized and optimized computing environment.
        </div>
      </li>
    </ul>

  )
}
export default timeLine
