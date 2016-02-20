import React from 'react'
import { render } from 'react-dom'
import { Router, Route, IndexRoute, Link, hashHistory } from 'react-router'
import Profile from './profile/Profile'
import Search  from './search/Search'

class App extends React.Component {
	constructor(props) {
		super(props);

	}

	render() {
		return (
			<div>
				<div ><Link to="/search">Search</Link></div>
				<div><Link to="/profile">Profile</Link></div>
				{this.props.children}
			</div>
		)
	}
}

render((
	<Router history={hashHistory}>
		<Route path="/" component={App}>
			<IndexRoute component= { welcome } />
			 <Route path='/profile' component={Profile} />
  		 <Route path="/search" component={Search} />
		</Route>
	</Router>
), document.getElementById('app'));

