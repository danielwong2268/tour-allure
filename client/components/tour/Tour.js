import React from 'react'
import $ from 'jquery'

export default class Tour extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name : "",
      location : "",
      price : "",
      description: "",
      createdBy: ""
    }
  }

  // Isolate tour ID from the url
  getID() {
    var splitURL = window.location.href.split('/');
    var id = splitURL[splitURL.length-1].split('?')[0];
    return id;
  }

  // Fetch tour data from server using its ID, and setState to the correct tour information before initial render
  componentWillMount() {
    // Fetch specified tour data from server using its unique ID
    $.post('http://localhost:8080/fetchTourInfo', {data: this.getID()})
    .done( (data) => {
      // Change state properties to equal fetched tour data so page renders with correct information
      this.setState({
        name : data.name,
        location : data.location,
        price : data.price,
        description: data.description,
        createdBy: data.createdBy
      })
    })
    .fail( (err) => {
      console.log('error getProfile', err);
    })
  }

  handleJoinTourClick() {
    $.post('http://localhost:8080/joinTour', {data: this.getID()})
      .done( (data) => {
        console.log('join tour successful!');
      })
      .fail( (err) => {
        console.log('error joining tour');
      })
  }

  render() {
    return (
      <div className='tourContainer'>
        <ul>
          <li>{this.state.name}</li>
          <li>{this.state.location }</li>
          <li>{this.state.price}</li>
          <li>{this.state.description}</li>
          <li>{this.state.createdBy}</li>
        </ul>
        <input type="submit" value="Join Tour" onClick={ () => this.handleJoinTourClick() }/>
      </div>
    )
  }
}