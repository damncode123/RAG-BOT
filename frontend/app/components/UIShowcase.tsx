'use client';

import { useState } from 'react';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  LightBulbIcon,
  CpuChipIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function UIShowcase() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: SparklesIcon,
      title: "AI-Powered Intelligence",
      description: "Advanced language models provide intelligent responses to your queries",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: DocumentTextIcon,
      title: "Document Processing",
      description: "Upload and analyze documents with sophisticated retrieval technology",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Natural Conversations",
      description: "Engage in natural, context-aware conversations with your AI assistant",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security measures",
      color: "from-indigo-500 to-blue-600"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <CpuChipIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Modern UI Features
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-300">
          Experience the power of modern design with dark mode support
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={index}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-105 ${
                activeFeature === index
                  ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700 shadow-xl'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveFeature(index)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Interactive Demo */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <LightBulbIcon className="w-8 h-8 text-yellow-500" />
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Interactive Elements
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Sample buttons */}
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-200">
              Primary Action
            </button>
            <button className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200">
              Secondary Action
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-200">
              Success Action
            </button>
          </div>

          {/* Sample input */}
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Try typing here..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Sample cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mb-3"></div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Feature {i}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Sample description for feature {i}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
