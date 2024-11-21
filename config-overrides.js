module.exports = {
    webpack: (config) => {
      // Adding Babel loader for .js files
      config.module.rules.push({
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Ensure React preset is included
            plugins: [
              '@babel/plugin-proposal-optional-chaining', // Enable optional chaining support
              '@babel/plugin-proposal-nullish-coalescing-operator' // Enable nullish coalescing operator support
            ]
          },
        },
      });
  
      return config;
    },
  };
  